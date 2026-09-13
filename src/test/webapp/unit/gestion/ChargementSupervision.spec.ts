import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { ChargementSupervision } from '@/gestion/contexts/supervision-atelier/application/ChargementSupervision';
import { ActiviteDeSupervision } from '@/gestion/contexts/supervision-atelier/domain/ActiviteDeSupervision';
import { ActivitesDeSupervisionPort } from '@/gestion/contexts/supervision-atelier/domain/ActivitesDeSupervisionPort';
import { CategorieActivite } from '@/gestion/contexts/supervision-atelier/domain/CategorieActivite';
import { DonneesDeSupervisionPort } from '@/gestion/contexts/supervision-atelier/domain/DonneesDeSupervisionPort';
import { IdentifiantActivite } from '@/gestion/contexts/supervision-atelier/domain/IdentifiantActivite';
import { IdentifiantOperateur } from '@/gestion/contexts/supervision-atelier/domain/IdentifiantOperateur';
import { Instant } from '@/gestion/contexts/supervision-atelier/domain/Instant';
import { JourneeDeTravail } from '@/gestion/contexts/supervision-atelier/domain/JourneeDeTravail';
import { JourneesDeSupervisionPort } from '@/gestion/contexts/supervision-atelier/domain/JourneesDeSupervisionPort';
import { OperateurDeclare } from '@/gestion/contexts/supervision-atelier/domain/OperateurDeclare';
import { OperateursDeSupervisionPort } from '@/gestion/contexts/supervision-atelier/domain/OperateursDeSupervisionPort';
import { CompositeDonneesDeSupervision } from '@/gestion/contexts/supervision-atelier/infrastructure/secondary/CompositeDonneesDeSupervision';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { beforeEach, describe, expect, it } from 'vitest';

class DeferredFixture<T> {
  resolve: (value: T) => void = () => {
    throw new Error('Uninitialized chargementFixture');
  };
  reject: (reason: Error) => void = () => {
    throw new Error('Uninitialized chargementFixture');
  };
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

class LectureFixture<T> {
  readCount = 0;
  private arrival = new DeferredFixture<void>();
  private response = new DeferredFixture<Page<T>>();
  private synchronousFailure: Error | undefined;
  get arrived(): Promise<void> {
    return this.arrival.promise;
  }

  prepare(): void {
    this.arrival = new DeferredFixture<void>();
    this.response = new DeferredFixture<Page<T>>();
    this.synchronousFailure = undefined;
  }

  failImmediately(error: Error): void {
    this.synchronousFailure = error;
  }

  read(): Promise<Page<T>> {
    this.readCount += 1;
    this.arrival.resolve();
    if (this.synchronousFailure) {
      throw this.synchronousFailure;
    }
    return this.response.promise;
  }

  async failAndObserve(): Promise<void> {
    this.fail();
    await Promise.allSettled([this.response.promise]);
  }

  fail(): void {
    this.response.reject(new Error('Source unavailable'));
  }

  release(page: Page<T>): void {
    this.response.resolve(page);
  }
}

const aliceFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
const maintenantFixture = new Instant('2026-09-13T10:00:00Z');

class ChargementFixture {
  readonly operateurs = new LectureFixture<OperateurDeclare>();
  readonly journees = new LectureFixture<JourneeDeTravail>();
  readonly activites = new LectureFixture<ActiviteDeSupervision>();
  readonly errorHandler: ErrorHandlerFixture;
  readonly chargement: ChargementSupervision;

  constructor() {
    TestBed.configureTestingModule({
      providers: [
        ChargementSupervision,
        { provide: DonneesDeSupervisionPort, useClass: CompositeDonneesDeSupervision },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: OperateursDeSupervisionPort, useValue: this.operateurs },
        { provide: JourneesDeSupervisionPort, useValue: this.journees },
        { provide: ActivitesDeSupervisionPort, useValue: this.activites },
      ],
    });
    this.errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
    this.chargement = TestBed.inject(ChargementSupervision);
  }

  async loadInitial(): Promise<void> {
    const loading = this.chargement.refresh(maintenantFixture);
    await this.arrived();
    this.operateurs.release(new Page([aliceFixture], 1));
    this.journees.release(new Page([], 0));
    this.activites.release(new Page([], 0));
    await loading;
    this.operateurs.prepare();
    this.journees.prepare();
    this.activites.prepare();
  }

  async arrived(): Promise<void> {
    await Promise.all([this.operateurs.arrived, this.journees.arrived, this.activites.arrived]);
  }
}

describe('ChargementSupervision', () => {
  let chargementFixture: ChargementFixture;
  beforeEach(() => {
    chargementFixture = new ChargementFixture();
  });

  it('should reject an activity whose operator cannot be identified', async () => {
    const activiteFixture = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: undefined,
      nom: 'OF-42',
      categorie: new CategorieActivite('NC'),
      debut: maintenantFixture,
    });
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.arrived();
    chargementFixture.operateurs.release(new Page([aliceFixture], 1));
    chargementFixture.journees.release(new Page([], 0));
    chargementFixture.activites.release(new Page([activiteFixture], 1));

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
  });

  it('should reread visits and activities while retaining the mounted operator reference', async () => {
    await chargementFixture.loadInitial();
    chargementFixture.operateurs.release(new Page([], 0));
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.release(new Page([JourneeDeTravail.open(aliceFixture.id, 'EN_PAUSE')], 1));
    chargementFixture.activites.release(new Page([], 0));

    await loading;

    expect(chargementFixture.chargement.state().status).toBe('ready');
    expect(chargementFixture.chargement.state().supervision?.operateurs).toMatchObject([
      { operateur: { nom: 'Martin', prenom: 'Alice' }, presence: 'EN_PAUSE' },
    ]);
  });

  it('should retain the last complete grid after a refresh source failure', async () => {
    await chargementFixture.loadInitial();
    const previous = chargementFixture.chargement.state().supervision;
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.fail();
    chargementFixture.activites.release(new Page([], 0));

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: previous });
  });

  it('should retain the last complete grid after a refresh truncated visit read', async () => {
    await chargementFixture.loadInitial();
    const previous = chargementFixture.chargement.state().supervision;
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.release(new Page([], 1));
    chargementFixture.activites.release(new Page([], 0));

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: previous });
  });

  it('should retain the last complete grid after a refresh truncated activity read', async () => {
    await chargementFixture.loadInitial();
    const previous = chargementFixture.chargement.state().supervision;
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.release(new Page([], 0));
    chargementFixture.activites.release(new Page([], 1));

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: previous });
  });

  it('should retain the last complete grid after a refresh unidentifiable activity', async () => {
    await chargementFixture.loadInitial();
    const previous = chargementFixture.chargement.state().supervision;
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.release(new Page([], 0));
    chargementFixture.activites.release(
      new Page(
        [
          new ActiviteDeSupervision({
            id: new IdentifiantActivite('act-1'),
            operateurId: new IdentifiantOperateur('unknown'),
            nom: 'OF-42',
            categorie: new CategorieActivite('NC'),
            debut: maintenantFixture,
          }),
        ],
        1,
      ),
    );

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: previous });
  });

  it('should recover after a failed refresh and replace the stale grid', async () => {
    await chargementFixture.loadInitial();
    const failed = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.fail();
    chargementFixture.activites.release(new Page([], 0));
    await failed;
    chargementFixture.journees.prepare();
    chargementFixture.activites.prepare();

    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.release(new Page([JourneeDeTravail.open(aliceFixture.id, 'PRESENT')], 1));
    chargementFixture.activites.release(new Page([], 0));
    await loading;

    expect(chargementFixture.chargement.state().status).toBe('ready');
    expect(chargementFixture.chargement.state().supervision?.operateurs[0]?.isEnGlm()).toBe(true);
  });

  it('should keep the read locked after one failure until the remaining sources settle', async () => {
    const first = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.arrived();
    chargementFixture.operateurs.release(new Page([aliceFixture], 1));
    await chargementFixture.journees.failAndObserve();

    const second = chargementFixture.chargement.refresh(maintenantFixture);
    chargementFixture.activites.release(new Page([], 0));
    await Promise.all([first, second]);

    expect(chargementFixture.operateurs.readCount).toBe(1);
    expect(chargementFixture.journees.readCount).toBe(1);
    expect(chargementFixture.activites.readCount).toBe(1);
    expect(chargementFixture.chargement.state().status).toBe('failed');
  });

  it('should retain a complete reference even when the initial visit read fails', async () => {
    const failed = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.arrived();
    chargementFixture.journees.fail();
    chargementFixture.operateurs.release(new Page([aliceFixture], 1));
    chargementFixture.activites.release(new Page([], 0));
    await failed;
    chargementFixture.operateurs.prepare();
    chargementFixture.operateurs.release(new Page([], 0));
    chargementFixture.journees.prepare();
    chargementFixture.activites.prepare();

    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.release(new Page([], 0));
    chargementFixture.activites.release(new Page([], 0));
    await loading;

    expect(chargementFixture.chargement.state().supervision?.operateurs).toMatchObject([
      { operateur: { prenom: 'Alice' }, presence: 'ABSENT' },
    ]);
    expect(chargementFixture.operateurs.readCount).toBe(1);
  });

  it('should handle and report synchronous port failures without an unhandled rejection', async () => {
    chargementFixture.journees.failImmediately(new Error('Immediate failure'));
    chargementFixture.operateurs.release(new Page([aliceFixture], 1));
    chargementFixture.activites.release(new Page([], 0));

    await chargementFixture.chargement.refresh(maintenantFixture);

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
    expect(chargementFixture.errorHandler.errors).toHaveLength(1);
    expect((chargementFixture.errorHandler.errors[0] as Error).message).toBe('Immediate failure');
  });

  it('should retry reading operators and publish grid once the reference becomes complete', async () => {
    const firstLoading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.arrived();
    chargementFixture.operateurs.release(new Page([aliceFixture], 2));
    chargementFixture.journees.release(new Page([], 0));
    chargementFixture.activites.release(new Page([], 0));
    await firstLoading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
    expect(chargementFixture.operateurs.readCount).toBe(1);

    chargementFixture.operateurs.prepare();
    chargementFixture.journees.prepare();
    chargementFixture.activites.prepare();

    const secondLoading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.arrived();
    chargementFixture.operateurs.release(new Page([aliceFixture], 1));
    chargementFixture.journees.release(new Page([], 0));
    chargementFixture.activites.release(new Page([], 0));
    await secondLoading;

    expect(chargementFixture.chargement.state().status).toBe('ready');
    expect(chargementFixture.operateurs.readCount).toBe(2);
    expect(chargementFixture.chargement.state().supervision?.operateurs).toMatchObject([
      { operateur: { nom: 'Martin', prenom: 'Alice' }, presence: 'ABSENT' },
    ]);
  });

  it('should retain a cached reference independent of subsequent source array changes', async () => {
    const elementsFixture = [aliceFixture];
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.arrived();
    chargementFixture.operateurs.release(new Page(elementsFixture, 1));
    chargementFixture.journees.release(new Page([], 0));
    chargementFixture.activites.release(new Page([], 0));
    await loading;
    elementsFixture.length = 0;

    chargementFixture.journees.prepare();
    chargementFixture.activites.prepare();
    const secondLoading = chargementFixture.chargement.refresh(maintenantFixture);
    await Promise.all([chargementFixture.journees.arrived, chargementFixture.activites.arrived]);
    chargementFixture.journees.release(new Page([], 0));
    chargementFixture.activites.release(new Page([], 0));
    await secondLoading;

    expect(chargementFixture.chargement.state().supervision?.operateurs).toMatchObject([{ operateur: { nom: 'Martin', prenom: 'Alice' } }]);
  });
});
