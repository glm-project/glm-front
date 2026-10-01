import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import { GesteDePointage, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { HttpAtelierExchange } from '@/pupitre/contexts/atelier/infrastructure/secondary/http/HttpAtelierExchange';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

const entrepriseFixture = Entreprise.of('entreprise-a');
const gesteFixture: GesteDePointage = {
  id: 'arrivee-originale',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateurId: 'jean',
  nature: 'POINTAGE',
  suiviId: 'piece',
  intention: 'OUVERTURE',
  type: 'DEBUT',
};
const targetedFinishFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: '34f2039a-722a-43fc-ad88-4ecb928b5e99',
  dateDeSurvenue: '2026-09-05T17:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  posteId: 'tour',
  intention: 'FIN',
  type: 'FIN',
  cible: 'ouverture-originale',
};
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
  suivis: [
    {
      id: 'piece',
      nom: 'OF-1',
      type: 'PRODUIT',
      etat: 'EN_COURS',
      activites: [
        {
          operateurId: 'jean',
          ouverture: 'ouverture-originale',
          posteId: 'tour',
          categorie: 'TRAVAIL',
          depuis: '2026-09-05T08:00:00Z',
          echeance: '2026-09-05T21:00:00Z',
        },
      ],
      conflits: [],
      evenements: [],
    },
  ],
};
const openingBodyFixture = {
  id: 'arrivee-originale',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateur: 'jean',
  intention: 'OUVERTURE',
  type: 'DEBUT',
};
const finishBodyFixture = {
  id: '34f2039a-722a-43fc-ad88-4ecb928b5e99',
  dateDeSurvenue: '2026-09-05T17:00:00Z',
  operateur: 'jean',
  poste: 'tour',
  intention: 'FIN',
  type: 'FIN',
  cible: 'ouverture-originale',
};

class TimeoutSessionFixture extends DeviceSessionPort {
  private readonly locks = new BrowserLocksFixture();

  withSession<T>(action: () => Promise<T>): Promise<T> {
    return this.locks.request('session', action);
  }
}

describe('Pupitre synchronization over stalled HTTP', () => {
  let journal: JournauxDuPupitreFixture;
  let session: DeviceSessionPort;
  let synchronization: PupitreSynchronization;
  let http: HttpTestingController;
  let requestArrived: SignalFixture;

  beforeEach(() => {
    vi.useFakeTimers();
    journal = new JournauxDuPupitreFixture();
    requestArrived = new SignalFixture();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            (request, next) => {
              requestArrived.release();
              return next(request);
            },
          ]),
        ),
        provideHttpClientTesting(),
        ApiClient,
        PupitreSynchronization,
        { provide: AtelierExchangePort, useClass: HttpAtelierExchange },
        { provide: JournauxDuPupitrePort, useValue: journal },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        {
          provide: AuthenticationPort,
          useValue: {
            synchronizeSession: () => Promise.resolve(),
            currentTenant: () => 'entreprise-a',
            currentToken: () => 'authorized',
          },
        },
        { provide: DeviceSessionPort, useClass: TimeoutSessionFixture },
      ],
    });
    synchronization = TestBed.inject(PupitreSynchronization);
    session = TestBed.inject(DeviceSessionPort);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([
    { stage: 'send' as const, geste: gesteFixture, body: openingBodyFixture },
    { stage: 'reread' as const, geste: gesteFixture, body: openingBodyFixture },
    { stage: 'send' as const, geste: targetedFinishFixture, body: finishBodyFixture },
    { stage: 'reread' as const, geste: targetedFinishFixture, body: finishBodyFixture },
  ])(
    'should retain $geste.intention after a stalled $stage, release the session and replay its original body',
    async ({ stage, geste, body }) => {
      await givenPendingWork(geste);
      const first = whenSynchronizing();
      const stalled = await whenExchangeStalls(stage);
      const sessionWrite = whenQueuingASessionWrite();

      await whenThirtySecondsElapse();

      const sessionResult = await sessionWrite;
      await first;
      const referenceRequests = readPendingReferenceRequests();
      const pendingState = await journal.read(entrepriseFixture);

      const retry = whenSynchronizing();
      const request = await whenRequestArrives();
      whenServerAccepts(request);
      await whenReferenceRefreshCompletes();
      await retry;

      thenTheRequestWasCancelled(stalled);
      expect(sessionResult).toBe('session updated');
      expect(referenceRequests).toEqual([]);
      thenGestureIsPending(pendingState, geste);
      expect(pendingState.referentiel).toEqual(referenceFixture);
      thenTheGestureKeepsItsOriginalIdentity(request, body);
      await thenGestureIsAccepted(geste);
    },
  );

  const givenPendingWork = async (geste: GesteDePointage): Promise<void> => {
    await journal.saveReferentiel(entrepriseFixture, referenceFixture);
    await journal.append(entrepriseFixture, [geste]);
  };
  const whenSynchronizing = (): Promise<void> => synchronization.synchronize(() => undefined);
  const whenRequestArrives = async (): Promise<TestRequest> => {
    await requestArrived.promise;
    requestArrived = new SignalFixture();
    return http.expectOne(() => true);
  };
  const whenExchangeStalls = async (stage: 'send' | 'reread'): Promise<TestRequest> => {
    const request = await whenRequestArrives();
    if (stage === 'send') return request;
    request.flush(
      { type: 'urn:glm:erreur:atelier:saisie-concurrente', message: 'Concurrent update' },
      { status: 409, statusText: 'Conflict' },
    );
    return whenRequestArrives();
  };
  const whenQueuingASessionWrite = (): Promise<string> => session.withSession(() => Promise.resolve('session updated'));
  const whenThirtySecondsElapse = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(30_000);
  };
  const whenServerAccepts = (request: TestRequest): void => {
    request.flush({
      conflits: [],
      activitesEnCours: [],
      journal: [],
      id: 'piece',
      nom: 'OF-1',
      type: 'PRODUIT',
      etat: 'EN_ATTENTE',
      element: 'element',
      engageLe: '2026-09-05T07:00:00Z',
      engagePar: 'gestionnaire',
    });
  };
  const thenTheRequestWasCancelled = (request: TestRequest): void => {
    expect(request.cancelled).toBe(true);
  };
  const readPendingReferenceRequests = (): TestRequest[] => http.match(request => request.url === '/api/pupitre/referentiel');
  const thenTheGestureKeepsItsOriginalIdentity = (request: TestRequest, body: object): void => {
    expect(request.request.body).toEqual(body);
  };
  const whenReferenceRefreshCompletes = async (): Promise<void> => {
    await requestArrived.promise;
    requestArrived = new SignalFixture();
    http.expectOne('/api/pupitre/referentiel').flush({ genereLe: '2026-09-05T08:05:00Z', operateurs: [], suivis: [] });
  };
  const thenGestureIsPending = (state: Awaited<ReturnType<JournauxDuPupitrePort['read']>>, geste: GesteDePointage): void => {
    expect(state.evenements).toEqual([{ geste, etat: 'EN_ATTENTE' }]);
    expect(state.connecte).toBe(false);
  };
  const thenGestureIsAccepted = async (geste: GesteDePointage): Promise<void> => {
    const state = await journal.read(entrepriseFixture);
    expect(state.evenements).toEqual([{ geste, etat: 'ACCEPTE' }]);
    expect(state.connecte).toBe(true);
  };
});
