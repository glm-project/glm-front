import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../domain/CategorieActivite';
import { DonneesDeSupervisionPort, LectureDeSupervision } from '../domain/DonneesDeSupervisionPort';
import { IdentifiantActivite } from '../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../domain/IdentifiantOperateur';
import { Instant } from '../domain/Instant';
import { JourneeDeTravail } from '../domain/JourneeDeTravail';
import { OperateurDeclare } from '../domain/OperateurDeclare';
import { ChargementSupervision } from './ChargementSupervision';

class DonneesFixture extends DonneesDeSupervisionPort {
  readCount = 0;
  private synchronousFailure: Error | undefined;
  private release: (lecture: LectureDeSupervision) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  private reject: (error: Error) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  private announce: () => void = () => {
    throw new Error('Uninitialized fixture');
  };
  arrived = new Promise<void>(resolve => {
    this.announce = resolve;
  });
  private response = new Promise<LectureDeSupervision>((resolve, reject) => {
    this.release = resolve;
    this.reject = reject;
  });

  read(): Promise<LectureDeSupervision> {
    if (this.synchronousFailure) {
      throw this.synchronousFailure;
    }
    this.readCount += 1;
    this.announce();
    return this.response;
  }

  prepare(): void {
    this.arrived = new Promise<void>(resolve => {
      this.announce = resolve;
    });
    this.response = new Promise<LectureDeSupervision>((resolve, reject) => {
      this.release = resolve;
      this.reject = reject;
    });
  }

  complete(lecture: LectureDeSupervision = lectureFixture): void {
    this.release(lecture);
  }

  failImmediately(error: Error): void {
    this.synchronousFailure = error;
  }

  fail(): void {
    this.reject(new Error('Source unavailable'));
  }
}

const aliceFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
const lectureFixture: LectureDeSupervision = { status: 'complete', donnees: { operateurs: [aliceFixture], journees: [], activites: [] } };
const maintenantFixture = new Instant('2026-09-13T10:00:00Z');

class ChargementFixture {
  readonly donnees = new DonneesFixture();
  readonly errorHandler = new ErrorHandlerFixture();
  readonly chargement: ChargementSupervision;

  constructor() {
    TestBed.configureTestingModule({
      providers: [
        ChargementSupervision,
        { provide: DonneesDeSupervisionPort, useValue: this.donnees },
        { provide: ErrorHandlerPort, useValue: this.errorHandler },
      ],
    });
    this.chargement = TestBed.inject(ChargementSupervision);
  }

  async loadInitial(): Promise<void> {
    const loading = this.chargement.refresh(maintenantFixture);
    await this.donnees.arrived;
    this.donnees.complete();
    await loading;
    this.donnees.prepare();
  }

  destroy(): void {
    TestBed.resetTestingModule();
  }
}

describe('ChargementSupervision', () => {
  let chargementFixture: ChargementFixture;
  beforeEach(() => {
    chargementFixture = new ChargementFixture();
  });

  it('should expose an initial source failure without a grid', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.fail();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
  });

  it('should share the in-flight read when refresh is requested concurrently', async () => {
    const first = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    const second = chargementFixture.chargement.refresh(maintenantFixture);
    chargementFixture.donnees.complete();

    await Promise.all([first, second]);

    expect(chargementFixture.donnees.readCount).toBe(1);
    expect(chargementFixture.chargement.state().status).toBe('ready');
  });

  it('should discard a late successful response after the mounting injector is destroyed', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    const previous = chargementFixture.chargement.state();
    chargementFixture.destroy();
    chargementFixture.donnees.complete();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual(previous);
  });

  it('should discard a late failed response after the mounting injector is destroyed', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    const previous = chargementFixture.chargement.state();
    chargementFixture.destroy();
    chargementFixture.donnees.fail();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual(previous);
  });

  it('should not start reads when refresh is requested after destruction', async () => {
    chargementFixture.destroy();

    await chargementFixture.chargement.refresh(maintenantFixture);

    expect(chargementFixture.donnees.readCount).toBe(0);
  });

  it('should route read failures to the error handler', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.fail();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
    expect(chargementFixture.errorHandler.errors).toEqual([new Error('Source unavailable')]);
  });

  it('should handle and report synchronous port failures without an unhandled rejection', async () => {
    chargementFixture.donnees.failImmediately(new Error('Immediate failure'));

    await chargementFixture.chargement.refresh(maintenantFixture);

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
    expect(chargementFixture.errorHandler.errors).toEqual([new Error('Immediate failure')]);
  });

  it('should reject incomplete acquisition without publishing a grid', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.complete({ status: 'incomplete' });

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
  });

  it.each([undefined, new IdentifiantOperateur('unknown')])(
    'should reject an activity without an identifiable operator (%s)',
    async operateurId => {
      const activiteFixture = new ActiviteDeSupervision({
        id: new IdentifiantActivite('act-1'),
        operateurId,
        nom: 'OF-42',
        categorie: new CategorieActivite('NC'),
        debut: maintenantFixture,
      });
      const loading = chargementFixture.chargement.refresh(maintenantFixture);
      await chargementFixture.donnees.arrived;
      chargementFixture.donnees.complete({
        status: 'complete',
        donnees: { operateurs: [aliceFixture], journees: [], activites: [activiteFixture] },
      });

      await loading;

      expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
    },
  );

  it('should retain the last complete grid after a refresh failure', async () => {
    await chargementFixture.loadInitial();
    const previous = chargementFixture.chargement.state().supervision;
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.fail();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: previous });
  });

  it('should retain the last complete grid after incomplete acquisition', async () => {
    await chargementFixture.loadInitial();
    const previous = chargementFixture.chargement.state().supervision;
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.complete({ status: 'incomplete' });

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: previous });
  });

  it('should retain the last complete grid after an unidentifiable activity', async () => {
    await chargementFixture.loadInitial();
    const previous = chargementFixture.chargement.state().supervision;
    const activiteFixture = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: undefined,
      nom: 'OF-42',
      categorie: new CategorieActivite('NC'),
      debut: maintenantFixture,
    });
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.complete({
      status: 'complete',
      donnees: { operateurs: [aliceFixture], journees: [], activites: [activiteFixture] },
    });

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: previous });
  });

  it('should publish a grid once initially incomplete acquisition succeeds', async () => {
    const first = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.complete({ status: 'incomplete' });
    await first;
    chargementFixture.donnees.prepare();

    const second = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.complete();
    await second;

    expect(chargementFixture.chargement.state().status).toBe('ready');
    expect(chargementFixture.chargement.state().supervision?.operateurs).toMatchObject([
      { operateur: { nom: 'Martin', prenom: 'Alice' }, presence: 'ABSENT' },
    ]);
  });

  it('should recover after a failed refresh and replace the stale grid', async () => {
    await chargementFixture.loadInitial();
    const failed = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.fail();
    await failed;
    chargementFixture.donnees.prepare();

    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.complete({
      status: 'complete',
      donnees: {
        operateurs: [aliceFixture],
        journees: [JourneeDeTravail.open(aliceFixture.id, 'PRESENT')],
        activites: [],
      },
    });
    await loading;

    expect(chargementFixture.chargement.state().status).toBe('ready');
    expect(chargementFixture.chargement.state().supervision?.operateurs[0]?.isEnGlm()).toBe(true);
  });
});
