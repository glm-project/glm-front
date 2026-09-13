import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { IdentifiantActivite } from '../../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { Instant } from '../../domain/Instant';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { createSupervisionResource } from './createSupervisionResource';

class DeferredFixture<T> {
  resolve: (value: T) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  reject: (failure: Error) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

class DonneesFixture extends DonneesDeSupervisionPort {
  readCount = 0;
  arrival = new DeferredFixture<void>();
  response = new DeferredFixture<DonneesDeSupervision>();

  read(): Promise<DonneesDeSupervision> {
    this.readCount += 1;
    this.arrival.resolve();
    return this.response.promise;
  }

  prepare(): void {
    this.arrival = new DeferredFixture<void>();
    this.response = new DeferredFixture<DonneesDeSupervision>();
  }
}

const maintenantFixture = new Instant('2026-09-13T10:00:00Z');
const aliceFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
const donneesFixture: DonneesDeSupervision = {
  operateurs: [aliceFixture],
  journees: [JourneeDeTravail.open(aliceFixture.id, 'PRESENT')],
  activites: [],
};
const inexploitableFixture: DonneesDeSupervision = {
  operateurs: [aliceFixture],
  journees: [],
  activites: [
    new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: undefined,
      nom: 'OF-42',
      categorie: new CategorieActivite('NC'),
      debut: maintenantFixture,
    }),
  ],
};

class SupervisionFixture {
  readonly donnees = new DonneesFixture();
  readonly resource: ReturnType<typeof createSupervisionResource>;
  private readonly application: ApplicationRef;

  constructor() {
    TestBed.configureTestingModule({ providers: [{ provide: DonneesDeSupervisionPort, useValue: this.donnees }] });
    this.application = TestBed.inject(ApplicationRef);
    this.resource = TestBed.runInInjectionContext(() => createSupervisionResource(() => maintenantFixture));
  }

  async started(): Promise<void> {
    TestBed.tick();
    await this.donnees.arrival.promise;
  }

  async complete(donnees: DonneesDeSupervision = donneesFixture): Promise<void> {
    this.donnees.response.resolve(donnees);
    await this.application.whenStable();
  }

  async fail(): Promise<void> {
    this.donnees.response.reject(new Error('Source unavailable'));
    await this.application.whenStable();
  }

  async loadInitial(): Promise<void> {
    await this.started();
    await this.complete();
  }

  async reload(): Promise<void> {
    this.donnees.prepare();
    this.resource.reload();
    await this.started();
  }

  destroy(): void {
    this.resource.destroy();
  }
}

describe('Supervision resource', () => {
  let supervisionFixture: SupervisionFixture;
  beforeEach(() => {
    supervisionFixture = new SupervisionFixture();
  });

  it('should load the supervision without an application coordinator', async () => {
    await supervisionFixture.started();
    expect(supervisionFixture.resource.isLoading()).toBe(true);

    await supervisionFixture.complete();

    expect(supervisionFixture.resource.hasValue()).toBe(true);
    expect(supervisionFixture.resource.value()?.operateurs[0]?.isEnGlm()).toBe(true);
  });

  it('should expose an acquisition failure without a grid', async () => {
    await supervisionFixture.started();

    await supervisionFixture.fail();

    expect(supervisionFixture.resource.status()).toBe('error');
    expect(supervisionFixture.resource.hasValue()).toBe(false);
    expect(supervisionFixture.resource.error()?.message).toBe('Source unavailable');
  });

  it('should replace the previous grid with an error after a failed refresh', async () => {
    await supervisionFixture.loadInitial();
    await supervisionFixture.reload();

    await supervisionFixture.fail();

    expect(supervisionFixture.resource.status()).toBe('error');
    expect(supervisionFixture.resource.hasValue()).toBe(false);
  });

  it('should recover after a failed acquisition', async () => {
    await supervisionFixture.started();
    await supervisionFixture.fail();
    await supervisionFixture.reload();

    await supervisionFixture.complete();

    expect(supervisionFixture.resource.hasValue()).toBe(true);
    expect(supervisionFixture.resource.value()?.operateurs[0]?.isEnGlm()).toBe(true);
  });

  it('should expose the domain refusal as a view error', async () => {
    await supervisionFixture.started();

    await supervisionFixture.complete(inexploitableFixture);

    expect(supervisionFixture.resource.status()).toBe('error');
    expect(supervisionFixture.resource.hasValue()).toBe(false);
    expect(supervisionFixture.resource.error()?.message).toBe('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
  });

  it('should replace the previous grid with an error after a domain refusal', async () => {
    await supervisionFixture.loadInitial();
    await supervisionFixture.reload();

    await supervisionFixture.complete(inexploitableFixture);

    expect(supervisionFixture.resource.status()).toBe('error');
    expect(supervisionFixture.resource.hasValue()).toBe(false);
  });

  it('should ignore concurrent reload requests while acquisition is pending', async () => {
    await supervisionFixture.loadInitial();
    await supervisionFixture.reload();
    supervisionFixture.resource.reload();

    await supervisionFixture.complete();

    expect(supervisionFixture.donnees.readCount).toBe(2);
    expect(supervisionFixture.resource.hasValue()).toBe(true);
  });

  it('should discard a late success after destruction', async () => {
    await supervisionFixture.started();
    supervisionFixture.destroy();

    await supervisionFixture.complete();

    expect(supervisionFixture.resource.hasValue()).toBe(false);
    expect(supervisionFixture.resource.status()).toBe('idle');
  });

  it('should discard a late failure after destruction', async () => {
    await supervisionFixture.started();
    supervisionFixture.destroy();

    await supervisionFixture.fail();

    expect(supervisionFixture.resource.hasValue()).toBe(false);
    expect(supervisionFixture.resource.status()).toBe('idle');
  });
});
