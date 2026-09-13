import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { IdentifiantActivite } from '../../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { Instant } from '../../domain/Instant';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { SupervisionAtelier } from './supervision-atelier';

class DeferredFixture<T> {
  resolve: (value: T) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  reject: (error: Error) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

class DonneesFixture extends DonneesDeSupervisionPort {
  arrival = new DeferredFixture<void>();
  response = new DeferredFixture<DonneesDeSupervision>();

  read(): Promise<DonneesDeSupervision> {
    this.arrival.resolve();
    return this.response.promise;
  }

  prepare(): void {
    this.arrival = new DeferredFixture<void>();
    this.response = new DeferredFixture<DonneesDeSupervision>();
  }
}

const aliceFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
const donneesFixture: DonneesDeSupervision = {
  operateurs: [aliceFixture],
  journees: [JourneeDeTravail.open(aliceFixture.id, 'PRESENT')],
  activites: [
    new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: undefined,
      nom: 'OF-42',
      categorie: new CategorieActivite('NC'),
      debut: new Instant('2026-09-13T10:00:00Z'),
    }),
  ],
};

class SupervisionFixture {
  readonly donnees = new DonneesFixture();
  private readonly component: ComponentFixture<SupervisionAtelier>;

  constructor() {
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: DonneesDeSupervisionPort, useValue: this.donnees },
      ],
    });
    this.component = TestBed.createComponent(SupervisionAtelier);
  }

  async started(): Promise<void> {
    this.component.detectChanges();
    await this.donnees.arrival.promise;
  }

  element(selector: string): HTMLElement | null {
    const host = this.component.nativeElement as HTMLElement;
    return host.querySelector(dataSelector(selector));
  }

  async complete(donnees: DonneesDeSupervision = donneesFixture): Promise<void> {
    this.donnees.response.resolve(donnees);
    await this.component.whenStable();
  }

  async fail(): Promise<void> {
    this.donnees.response.reject(new Error('Source unavailable'));
    await this.component.whenStable();
  }

  async reload(): Promise<void> {
    this.donnees.prepare();
    const button = this.element('supervision-refresh');
    if (!button) {
      throw new Error('Missing refresh button');
    }
    button.click();
    await this.started();
  }

  async loadInitial(): Promise<void> {
    await this.started();
    await this.complete();
  }
}

describe('Supervision atelier component', () => {
  let supervisionFixture: SupervisionFixture;
  beforeEach(() => {
    supervisionFixture = new SupervisionFixture();
  });

  it('should display loading until the data arrives', async () => {
    await supervisionFixture.started();

    expect(supervisionFixture.element('supervision-loading')?.textContent).toContain('Chargement');
    expect(supervisionFixture.element('supervision-data')).toBeNull();
    expect(supervisionFixture.element('supervision-refresh')?.hasAttribute('disabled')).toBe(true);

    await supervisionFixture.complete();
  });

  it('should display the acquired collections without interpreting their business validity', async () => {
    await supervisionFixture.started();

    await supervisionFixture.complete();

    expect(supervisionFixture.element('supervision-operateurs-count')?.textContent.trim()).toBe('1');
    expect(supervisionFixture.element('supervision-journees-count')?.textContent.trim()).toBe('1');
    expect(supervisionFixture.element('supervision-activites-count')?.textContent.trim()).toBe('1');
    expect(supervisionFixture.element('supervision-loading')).toBeNull();
    expect(supervisionFixture.element('supervision-error')).toBeNull();
  });

  it('should display empty collections as a successful acquisition', async () => {
    await supervisionFixture.started();

    await supervisionFixture.complete({ operateurs: [], journees: [], activites: [] });

    expect(supervisionFixture.element('supervision-operateurs-count')?.textContent.trim()).toBe('0');
    expect(supervisionFixture.element('supervision-journees-count')?.textContent.trim()).toBe('0');
    expect(supervisionFixture.element('supervision-activites-count')?.textContent.trim()).toBe('0');
    expect(supervisionFixture.element('supervision-error')).toBeNull();
  });

  it('should display an acquisition error without data', async () => {
    await supervisionFixture.started();

    await supervisionFixture.fail();

    expect(supervisionFixture.element('supervision-error')?.textContent).toContain('Impossible de charger');
    expect(supervisionFixture.element('supervision-data')).toBeNull();
    expect(supervisionFixture.element('supervision-refresh')?.hasAttribute('disabled')).toBe(false);
  });

  it('should replace previously displayed data with an error when refresh fails', async () => {
    await supervisionFixture.loadInitial();
    await supervisionFixture.reload();

    await supervisionFixture.fail();

    expect(supervisionFixture.element('supervision-error')?.textContent).toContain('Impossible de charger');
    expect(supervisionFixture.element('supervision-data')).toBeNull();
  });

  it('should display fresh data when the user retries after an error', async () => {
    await supervisionFixture.started();
    await supervisionFixture.fail();
    await supervisionFixture.reload();

    await supervisionFixture.complete();

    expect(supervisionFixture.element('supervision-operateurs-count')?.textContent.trim()).toBe('1');
    expect(supervisionFixture.element('supervision-error')).toBeNull();
  });
});
