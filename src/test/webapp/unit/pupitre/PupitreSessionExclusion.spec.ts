import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { IndexedDbJournauxDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/IndexedDbJournauxDuPupitre';
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
    return this.answer({ access_token: 'original-token', refresh_token: 'refresh', expires_in: 300 });
  }

  grantRenewal(): void {
    this.chronology.push('renewal-finished');
    this.renewal.next(new HttpResponse({ body: { access_token: 'renewed-token', refresh_token: 'rotated-refresh', expires_in: 300 } }));
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

describe('Pupitre replay and device renewal exclusion', () => {
  let authentication: AuthenticationPort;
  let journal: JournauxDuPupitrePort;
  let server: AuthorizationServerFixture;

  beforeEach(() => {
    vi.useFakeTimers();
    server = new AuthorizationServerFixture();
    const injector = Injector.create({
      providers: [
        DeviceAuthentication,
        DeviceGrantClient,
        IndexedDbJournauxDuPupitre,
        { provide: HttpBackend, useValue: server },
        { provide: LocalStoragePort, useClass: StorageFixture },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: DeviceGrantConfiguration, useValue: new DeviceGrantConfiguration('http://keycloak.test', 'glm', 'pupitre') },
      ],
    });
    authentication = injector.get(DeviceAuthentication);
    journal = injector.get(IndexedDbJournauxDuPupitre);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should wait for renewal and its durable rotation before replaying with the new token', async () => {
    await givenAnEnrolledSession();
    await whenRenewalStarts();

    const replay = whenReplaying();
    await whenLettingQueuedWorkRun();
    whenRenewalCompletes();
    const token = await replay;

    expect(server.chronology).toEqual(['renewal-started', 'renewal-finished', 'replay']);
    expect(token).toBe('renewed-token');
  });

  it('should finish an outgoing replay before starting a network renewal', async () => {
    await givenAnEnrolledSession();
    const entered = new SignalFixture();
    const release = new SignalFixture();

    const replay = whenHoldingReplay(entered, release);
    await entered.promise;
    await whenRenewalBecomesDue();
    await whenReleasingReplay(release, replay);
    await server.renewalArrived.promise;
    whenRenewalCompletes();
    await whenLettingQueuedWorkRun();

    expect(server.chronology).toEqual(['replay-started', 'replay-finished', 'renewal-started', 'renewal-finished']);
  });

  const givenAnEnrolledSession = async (): Promise<void> => {
    const enrolment = authentication.authenticate();
    await vi.advanceTimersByTimeAsync(1);
    await enrolment;
  };
  const whenRenewalBecomesDue = (): Promise<void> => vi.advanceTimersByTimeAsync(270_000).then(() => undefined);
  const whenRenewalStarts = async (): Promise<void> => {
    await whenRenewalBecomesDue();
    await server.renewalArrived.promise;
  };
  const whenLettingQueuedWorkRun = (): Promise<void> => vi.advanceTimersByTimeAsync(0).then(() => undefined);
  const whenRenewalCompletes = (): void => server.grantRenewal();
  const whenReplaying = (): Promise<string | undefined> =>
    journal.withSession(async () => {
      await authentication.synchronizeSession();
      server.chronology.push('replay');
      return authentication.currentToken();
    });
  const whenHoldingReplay = (entered: SignalFixture, release: SignalFixture): Promise<void> =>
    journal.withSession(async () => {
      server.chronology.push('replay-started');
      entered.release();
      await release.promise;
      server.chronology.push('replay-finished');
    });
  const whenReleasingReplay = async (release: SignalFixture, replay: Promise<void>): Promise<void> => {
    release.release();
    await replay;
  };
});
