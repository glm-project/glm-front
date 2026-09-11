import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import { GesteDAtelier } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
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
const gesteFixture: GesteDAtelier = {
  id: 'arrivee-originale',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateurId: 'jean',
  nature: 'ARRIVEE',
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

  it.each(['send', 'reread'] as const)(
    'should retain the gesture after a stalled %s, release the session and replay its original identity',
    async stage => {
      await givenPendingWork();
      const first = whenSynchronizing();
      const stalled = await whenExchangeStalls(stage);
      const sessionWrite = whenQueuingASessionWrite();

      await whenThirtySecondsElapse();

      thenTheRequestWasCancelled(stalled);
      await thenTheSessionWriteCompletes(sessionWrite);
      await thenSynchronizationCompletes(first);
      thenReferentialWasNotRead();
      await thenGestureIsPending();

      const retry = whenSynchronizing();
      const request = await whenRequestArrives();
      whenServerAccepts(request);
      await whenReferenceRefreshCompletes();
      await thenSynchronizationCompletes(retry);

      thenTheGestureKeepsItsOriginalIdentity(request);
      await thenGestureIsAccepted();
    },
  );

  const givenPendingWork = async (): Promise<void> => {
    await journal.append(entrepriseFixture, [gesteFixture]);
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
    request.flush({});
  };
  const thenTheRequestWasCancelled = (request: TestRequest): void => {
    expect(request.cancelled).toBe(true);
  };
  const thenTheSessionWriteCompletes = async (write: Promise<string>): Promise<void> => {
    await expect(write).resolves.toBe('session updated');
  };
  const thenSynchronizationCompletes = async (synchronization: Promise<void>): Promise<void> => {
    await synchronization;
  };
  const thenReferentialWasNotRead = (): void => {
    http.expectNone(request => request.url === '/api/operateurs');
    http.expectNone(request => request.url === '/api/atelier/suivis');
  };
  const thenTheGestureKeepsItsOriginalIdentity = (request: TestRequest): void => {
    expect(request.request.body).toEqual({ id: 'arrivee-originale', dateDeSurvenue: '2026-09-05T08:00:00Z', operateur: 'jean' });
  };
  const whenReferenceRefreshCompletes = async (): Promise<void> => {
    for (const url of ['/api/operateurs', '/api/atelier/suivis']) {
      const request = await whenRequestArrives();
      expect(request.request.url).toBe(url);
      request.flush({ content: [], currentPage: 0, pageSize: 100, totalElementsCount: 0 });
    }
  };
  const thenGestureIsPending = async (): Promise<void> => {
    const state = await journal.read(entrepriseFixture);
    expect(state.evenements).toEqual([{ geste: gesteFixture, etat: 'EN_ATTENTE' }]);
    expect(state.connecte).toBe(false);
  };
  const thenGestureIsAccepted = async (): Promise<void> => {
    const state = await journal.read(entrepriseFixture);
    expect(state.evenements).toEqual([{ geste: gesteFixture, etat: 'ACCEPTE', journeeOuverte: true }]);
    expect(state.connecte).toBe(true);
  };
});
