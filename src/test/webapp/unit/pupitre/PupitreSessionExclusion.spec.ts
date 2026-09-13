import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import { GesteDAtelier, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { ok, Result } from '@/pupitre/contexts/atelier/domain/synchronisation/Result';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { DeviceAuthentication } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceAuthentication';
import { DeviceGrantClient } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceGrantClient';
import { DeviceGrantConfiguration } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceGrantConfiguration';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { HttpBackend, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { Observable, Subject } from 'rxjs';

const entrepriseFixture = Entreprise.of('entreprise-a');
const gesteFixture: GesteDAtelier = {
  id: 'arrivee-1',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateurId: 'jean',
  nature: 'ARRIVEE',
};

const jwtWithTenant = (tenant: string, tag: string): string =>
  `header.${btoa(JSON.stringify({ tenant, tag })).replaceAll('=', '')}.signature`;

const originalToken = jwtWithTenant('entreprise-a', 'original');
const renewedToken = jwtWithTenant('entreprise-a', 'renewed');

class StorageFixture extends LocalStoragePort {
  private readonly documents = new Map<string, unknown>();
  private readonly locks = new BrowserLocksFixture();

  override async read<T>(key: string): Promise<T | undefined> {
    await Promise.resolve();
    return structuredClone(this.documents.get(key)) as T | undefined;
  }

  override async update<T>(key: string, initial: T, change: (value: T) => T): Promise<T> {
    await Promise.resolve();
    const updated = change((this.documents.get(key) as T | undefined) ?? initial);
    this.documents.set(key, structuredClone(updated));
    return updated;
  }

  override lock<T>(key: string, action: () => Promise<T>): Promise<T> {
    return this.locks.request(key, action);
  }
}

class AuthorizationServerFixture extends HttpBackend {
  readonly renewalArrived = new SignalFixture();
  private readonly renewal = new Subject<HttpEvent<unknown>>();
  readonly chronology: string[] = [];

  override handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    if (request.url.endsWith('/auth/device')) {
      return this.answer({
        device_code: 'device',
        user_code: 'CODE',
        verification_uri: 'http://keycloak.test',
        expires_in: 600,
        interval: 0,
      });
    }
    if (String(request.body).includes('grant_type=refresh_token')) {
      this.chronology.push('renewal-started');
      this.renewalArrived.release();
      return this.renewal;
    }
    return this.answer({ access_token: originalToken, refresh_token: 'refresh', expires_in: 300 });
  }

  grantRenewal(): void {
    this.chronology.push('renewal-finished');
    this.renewal.next(new HttpResponse({ body: { access_token: renewedToken, refresh_token: 'rotated-refresh', expires_in: 300 } }));
    this.renewal.complete();
  }

  private answer(body: unknown): Observable<HttpEvent<unknown>> {
    return new Observable(subscriber => {
      queueMicrotask(() => {
        subscriber.next(new HttpResponse({ body }));
        subscriber.complete();
      });
    });
  }
}

class ExchangeBarrierFixture {
  private readonly arrival = new SignalFixture();
  private readonly continuation = new SignalFixture();
  readonly reached = this.arrival.promise;

  async hold(): Promise<void> {
    this.arrival.release();
    await this.continuation.promise;
  }

  release(): void {
    this.continuation.release();
  }
}

class AtelierExchangeFixture extends AtelierExchangePort {
  private nextSend: ExchangeBarrierFixture | undefined;
  tokenDuringReplay: string | undefined;

  constructor(
    private readonly authentication: () => AuthenticationPort,
    private readonly chronology: string[],
  ) {
    super();
  }

  holdNextSend(): ExchangeBarrierFixture {
    const barrier = new ExchangeBarrierFixture();
    this.nextSend = barrier;
    return barrier;
  }

  override async send(): Promise<Result<void, RefusDePublication>> {
    this.tokenDuringReplay = this.authentication().currentToken();
    const barrier = this.nextSend;
    this.nextSend = undefined;
    if (barrier !== undefined) {
      this.chronology.push('replay-started');
      await barrier.hold();
      this.chronology.push('replay-finished');
      return ok(undefined);
    }
    this.chronology.push('replay');
    return ok(undefined);
  }

  override reread(): Promise<void> {
    return Promise.resolve();
  }

  override referentiel(): Promise<ReferentielDuPupitre> {
    return Promise.resolve({ operateurs: [], suivis: [] });
  }
}

describe('Pupitre replay and device renewal exclusion', () => {
  let authentication: AuthenticationPort;
  let journal: JournauxDuPupitrePort;
  let server: AuthorizationServerFixture;
  let exchange: AtelierExchangeFixture;
  let synchronization: PupitreSynchronization;

  beforeEach(() => {
    vi.useFakeTimers();
    server = new AuthorizationServerFixture();
    exchange = new AtelierExchangeFixture(() => authentication, server.chronology);
    const injector = Injector.create({
      providers: [
        PupitreSynchronization,
        DeviceAuthentication,
        DeviceGrantClient,
        { provide: AuthenticationPort, useExisting: DeviceAuthentication },
        { provide: DeviceSessionPort, useExisting: DeviceAuthentication },
        { provide: JournauxDuPupitrePort, useClass: JournauxDuPupitreFixture },
        { provide: AtelierExchangePort, useValue: exchange },
        { provide: HttpBackend, useValue: server },
        { provide: LocalStoragePort, useClass: StorageFixture },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: DeviceGrantConfiguration, useValue: new DeviceGrantConfiguration('http://keycloak.test', 'glm', 'pupitre') },
      ],
    });
    authentication = injector.get(AuthenticationPort);
    journal = injector.get(JournauxDuPupitrePort);
    synchronization = injector.get(PupitreSynchronization);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should wait for renewal and its durable rotation before replaying with the new token', async () => {
    await givenAnEnrolledSession();
    await givenPendingWork();

    await givenRenewalIsInProgress();

    await whenReplayingDuringRenewal();

    expect(server.chronology).toEqual(['renewal-started', 'renewal-finished', 'replay']);
    expect(exchange.tokenDuringReplay).toBe(renewedToken);
  });

  it('should finish an outgoing replay before starting a network renewal', async () => {
    await givenAnEnrolledSession();
    await givenPendingWork();
    const replay = givenReplayIsInProgress();

    await whenRenewalBecomesDueDuringReplay(replay);

    expect(server.chronology).toEqual(['replay-started', 'replay-finished', 'renewal-started', 'renewal-finished']);
  });

  const givenAnEnrolledSession = async (): Promise<void> => {
    const enrolment = authentication.authenticate();
    await vi.advanceTimersByTimeAsync(1);
    await enrolment;
  };
  const givenPendingWork = async (): Promise<void> => {
    await journal.append(entrepriseFixture, [gesteFixture]);
  };
  const whenRenewalBecomesDue = (): Promise<void> => vi.advanceTimersByTimeAsync(270_000).then(() => undefined);
  const givenRenewalIsInProgress = async (): Promise<void> => {
    await whenRenewalBecomesDue();
    await server.renewalArrived.promise;
  };
  const whenLettingQueuedWorkRun = (): Promise<void> => vi.advanceTimersByTimeAsync(0).then(() => undefined);
  const whenRenewalCompletes = (): void => server.grantRenewal();
  const whenSynchronizing = (): Promise<void> => synchronization.synchronize(() => undefined);
  const whenReplayingDuringRenewal = async (): Promise<void> => {
    const replay = whenSynchronizing();
    await whenLettingQueuedWorkRun();
    whenRenewalCompletes();
    await replay;
  };
  const givenReplayIsInProgress = () => {
    const barrier = exchange.holdNextSend();
    const completion = whenSynchronizing();
    return { barrier, completion };
  };
  const whenRenewalBecomesDueDuringReplay = async (replay: {
    barrier: ExchangeBarrierFixture;
    completion: Promise<void>;
  }): Promise<void> => {
    await replay.barrier.reached;
    await whenRenewalBecomesDue();
    replay.barrier.release();
    await replay.completion;
    await server.renewalArrived.promise;
    whenRenewalCompletes();
    await whenLettingQueuedWorkRun();
  };
});
