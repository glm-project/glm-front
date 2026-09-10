import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import { GesteDAtelier, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { IndexedDbJournauxDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/IndexedDbJournauxDuPupitre';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { DeviceAuthentication } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceAuthentication';
import { DeviceGrantClient } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceGrantClient';
import { DeviceGrantConfiguration } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceGrantConfiguration';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { HttpBackend, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
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

class AtelierExchangeFixture extends AtelierExchangePort {
  onSend: ((geste: GesteDAtelier) => Promise<void> | void) | undefined;

  override async send(geste: GesteDAtelier): Promise<void> {
    if (this.onSend !== undefined) {
      await this.onSend(geste);
    }
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
    exchange = new AtelierExchangeFixture();
    const injector = Injector.create({
      providers: [
        PupitreSynchronization,
        DeviceAuthentication,
        DeviceGrantClient,
        IndexedDbJournauxDuPupitre,
        { provide: AuthenticationPort, useExisting: DeviceAuthentication },
        { provide: DeviceSessionPort, useExisting: DeviceAuthentication },
        { provide: JournauxDuPupitrePort, useExisting: IndexedDbJournauxDuPupitre },
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
    const token = givenCapturedTokenDuringReplay();

    await givenRenewalIsInProgress();

    await whenReplayingDuringRenewal();

    expect(server.chronology).toEqual(['renewal-started', 'renewal-finished', 'replay']);
    expect(token.duringReplay).toBe(renewedToken);
  });

  it('should finish an outgoing replay before starting a network renewal', async () => {
    await givenAnEnrolledSession();
    await givenPendingWork();
    const replay = await givenReplayIsInProgress();

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
  const givenCapturedTokenDuringReplay = (): { duringReplay: string | undefined } => {
    const token = { duringReplay: undefined as string | undefined };
    exchange.onSend = () => {
      server.chronology.push('replay');
      token.duringReplay = authentication.currentToken();
    };
    return token;
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
  const givenReplayIsInProgress = async () => {
    const entered = new SignalFixture();
    const release = new SignalFixture();
    exchange.onSend = async () => {
      server.chronology.push('replay-started');
      entered.release();
      await release.promise;
      server.chronology.push('replay-finished');
    };
    const completion = whenSynchronizing();
    await entered.promise;
    return { release, completion };
  };
  const whenRenewalBecomesDueDuringReplay = async (replay: { release: SignalFixture; completion: Promise<void> }): Promise<void> => {
    await whenRenewalBecomesDue();
    replay.release.release();
    await replay.completion;
    await server.renewalArrived.promise;
    whenRenewalCompletes();
    await whenLettingQueuedWorkRun();
  };
});
