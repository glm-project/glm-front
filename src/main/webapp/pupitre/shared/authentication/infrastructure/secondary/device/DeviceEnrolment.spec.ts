import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import {
  DeviceAuthorizationCode,
  DeviceEnrolmentOutcome,
  DeviceEnrolmentPort,
} from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { DeviceAuthentication } from './DeviceAuthentication';
import { DeviceGrantClient } from './DeviceGrantClient';
import { DeviceGrantConfiguration } from './DeviceGrantConfiguration';

const baseFixture = 'http://keycloak.test/realms/glm/protocol/openid-connect';
const jwtFixture = (claims: unknown): string => `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify(claims))}.signature`;
const tokenFixture = jwtFixture({ tenant: 'entreprise-a' });
const rotatedFixture = jwtFixture({ tenant: 'entreprise-a', version: 2 });
const anotherCompanyTokenFixture = jwtFixture({ tenant: 'entreprise-b' });
const tokenWithoutPayloadFixture = 'malformed-token';
const undecodableTokenFixture = 'header.%.signature';

const afterMicrotasks = (): Promise<void> =>
  new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(undefined);
  });

class StorageFixture extends LocalStoragePort {
  value: unknown;
  failRead = false;
  failWrite = false;
  beforeCommit: (() => void) | undefined;
  private readonly tails = new Map<string, Promise<void>>();
  private readonly pendingIO: SignalFixture[] = [];
  private ioAvailable = new SignalFixture();

  snapshot(): unknown {
    return structuredClone(this.value);
  }

  restore(snapshot: unknown): void {
    this.value = structuredClone(snapshot);
  }

  clear(): void {
    this.value = undefined;
  }

  async drainIO(): Promise<void> {
    await this.releaseNextIO();
    for (;;) {
      while (this.pendingIO.length > 0) {
        this.pendingIO.shift()?.release();
        await Promise.resolve();
      }
      await afterMicrotasks();
      if (this.pendingIO.length === 0) {
        return;
      }
    }
  }

  async completeIOUntil<T>(operation: Promise<T>): Promise<T> {
    const operationCompleted = operation.then(
      () => true,
      () => true,
    );
    for (;;) {
      if (this.pendingIO.length > 0) {
        this.pendingIO.shift()?.release();
        await Promise.resolve();
      } else {
        const completed = await Promise.race([operationCompleted, this.ioAvailable.promise.then(() => false)]);
        if (completed) {
          return operation;
        }
      }
    }
  }

  override async read<T>(): Promise<T | undefined> {
    await this.waitForIO();
    if (this.failRead) {
      throw new Error('lecture impossible');
    }
    return structuredClone(this.value) as T | undefined;
  }
  override async update<T>(_key: string, initial: T, change: (value: T) => T): Promise<T> {
    await this.waitForIO();
    const callback = this.beforeCommit;
    this.beforeCommit = undefined;
    callback?.();
    if (this.failWrite) {
      this.failWrite = false;
      throw new Error('ecriture impossible');
    }
    this.value = structuredClone(change((this.value as T | undefined) ?? initial));
    return this.value as T;
  }
  override async lock<T>(cle: string, action: () => Promise<T>): Promise<T> {
    const locked = (this.tails.get(cle) ?? Promise.resolve()).then(action);
    this.tails.set(
      cle,
      locked.then(
        () => undefined,
        () => undefined,
      ),
    );
    return locked;
  }

  private waitForIO(): Promise<void> {
    const signal = new SignalFixture();
    this.pendingIO.push(signal);
    this.ioAvailable.release();
    this.ioAvailable = new SignalFixture();
    return signal.promise;
  }

  private async releaseNextIO(): Promise<void> {
    if (this.pendingIO.length === 0) {
      await this.ioAvailable.promise;
    }
    this.pendingIO.shift()?.release();
    await Promise.resolve();
  }
}

describe('Persistent device enrolment, through AuthenticationPort', () => {
  let authentication: AuthenticationPort;
  let stockage: StorageFixture;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    stockage = new StorageFixture();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DeviceGrantClient,
        DeviceAuthentication,
        { provide: DeviceGrantConfiguration, useValue: new DeviceGrantConfiguration('http://keycloak.test', 'glm', 'pupitre') },
        { provide: LocalStoragePort, useValue: stockage },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
    authentication = TestBed.inject(DeviceAuthentication);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should enrol once and restore its company and credential after a browser restart', async () => {
    await whenEnrolling(tokenFixture);

    const restarted = await whenRestartingTheBrowser();

    thenSessionIs(restarted, tokenFixture, 'entreprise-a');
  });

  it('should preserve the company when restarting with an expired token and no network', async () => {
    await givenAnExpiredEnrolledSession();

    await whenRenewalCannotReachTheServer();

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should commit rotating refresh credentials before exposing a renewed token', async () => {
    await givenAnEnrolledSession();

    await whenTheRenewalIsDue();
    await whenTheServerGrantsARenewal();

    thenSessionIs(authentication, tokenFixture, 'entreprise-a');

    await whenRenewalPersistenceCompletes();

    thenSessionIs(authentication, rotatedFixture, 'entreprise-a');

    const restarted = await whenRestartingAndAttemptingRenewal();

    thenRestartedSessionRenewsWith(restarted, 'refresh-2', rotatedFixture, 'entreprise-a');
  });

  it('should adopt a refresh already rotated by another tab before renewing', async () => {
    await givenAnEnrolledSession();
    await givenAnotherTabRenewedItsSession();

    await whenTheRenewalIsDue();

    thenSessionIs(authentication, rotatedFixture, 'entreprise-a');
  });

  it('should retain the company while requiring a new enrolment after revocation', async () => {
    await givenAnEnrolledSession();

    await whenRenewalIsRevokedAndReenrolmentIsUnavailable();
    const restarted = await whenRestartingWithoutAStoredCredential();

    thenSessionIs(authentication, undefined, 'entreprise-a');
    thenSessionIs(restarted, undefined, 'entreprise-a');
  });

  it('should clear durable credentials on logout without deleting the selected company', async () => {
    await givenAnEnrolledSession();

    await whenLoggingOut();
    const restarted = await whenRestartingWithoutAStoredCredential();

    thenSessionIs(authentication, undefined, 'entreprise-a');
    thenSessionIs(restarted, undefined, 'entreprise-a');
  });

  it('should expose no session when storage cannot be read or committed', async () => {
    givenStorageCannotBeRead();

    await whenRestoring();

    thenSessionIs(authentication, undefined, undefined);

    givenStorageCanBeReadButNotCommitted();

    await whenEnrolling(tokenFixture);

    thenSessionIs(authentication, undefined, undefined);
  });

  it('should keep the last committed access token when persisting a renewal fails', async () => {
    await givenAnEnrolledSession();
    givenTheNextStorageWriteFails();

    await whenRenewalIsGranted();

    thenSessionIs(authentication, tokenFixture, 'entreprise-a');
  });

  it.each([null, {}, { tenant: 12 }, { tenant: '' }, 'claims'])(
    'should never invent a company absent from the token (%j)',
    async claims => {
      const token = givenATokenWith(claims);

      await whenEnrolling(token);

      thenSessionIs(authentication, token, undefined);
    },
  );

  it.each([
    ['no payload', tokenWithoutPayloadFixture],
    ['an undecodable payload', undecodableTokenFixture],
  ])('should accept a malformed token with %s without inventing a company', async (_malformation, token) => {
    await whenEnrolling(token);

    thenSessionIs(authentication, token, undefined);
  });

  it('should report an unsuccessful durable logout', async () => {
    await givenAnEnrolledSession();
    givenTheNextStorageWriteFails();

    await whenLoggingOut();

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should not restore a session whose boot was abandoned during the disk read', async () => {
    await givenAnEnrolledSessionWithoutRestoringIt();

    const restoration = whenRestoringInBackground();
    whenLoggingOutBeforeRestoreCompletes();
    await whenStorageCompletes(restoration);

    thenSessionIs(authentication, undefined, undefined);
  });

  it('should not expose a granted session when logout happens during its durable commit', async () => {
    givenLogoutDuringTheNextStorageCommit();

    await whenEnrolling(tokenFixture);
    const restarted = await whenRestartingWithoutAStoredCredential();

    thenSessionIs(authentication, undefined, undefined);
    thenSessionIs(restarted, undefined, undefined);
  });

  it.each([false, true])('should not resurrect a session abandoned during renewal persistence (failure %s)', async failure => {
    await givenAnEnrolledSession();
    givenLogoutDuringTheNextStorageCommit(failure);

    await whenRenewalIsGrantedAndLogoutCompletes();
    const restarted = await whenRestartingWithoutAStoredCredential();

    thenSessionIs(authentication, undefined, 'entreprise-a');
    thenSessionIs(restarted, undefined, 'entreprise-a');
  });

  it('should preserve a new company selected while an abandoned renewal is being removed', async () => {
    const anotherCompany = await givenAnEnrolledSessionAndCaptureAnotherCompany();
    givenAnotherCompanyReplacesTheAbandonedRenewal(anotherCompany);

    await whenRenewalIsGrantedAndLogoutCompletes();
    const restarted = await whenRestartingTheBrowser();

    thenSessionIs(authentication, undefined, 'entreprise-a');
    thenSessionIs(restarted, anotherCompanyTokenFixture, 'entreprise-b');
  });

  it('should not adopt another tab’s renewal after local logout', async () => {
    await givenAnEnrolledSession();
    await givenAnotherTabRenewedItsSession();

    await whenRenewalStartsAndTheLocalSessionLogsOut();

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should adopt another company selected in a different tab before exchanging data', async () => {
    await givenAnEnrolledSession();
    await givenAnotherCompanyWasEnrolled();

    await whenSynchronizingTheSession();

    thenSessionIs(authentication, anotherCompanyTokenFixture, 'entreprise-b');
  });

  it('should clear credentials revoked in another tab while retaining its company', async () => {
    await givenAnEnrolledSession();
    await givenAnotherTabLoggedOut();

    await whenSynchronizingTheSession();

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should leave a synchronized session unchanged', async () => {
    await givenAnEnrolledSession();

    await whenSynchronizingTheSession();

    thenSessionIs(authentication, tokenFixture, 'entreprise-a');
  });

  it('should discard a cross-tab session read abandoned by a local logout', async () => {
    await givenAnEnrolledSession();

    await whenLoggingOutDuringSessionSynchronization();

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should make no refresh request after another tab removed the enrolment', async () => {
    await givenAnEnrolledSession();
    givenAnotherTabRemovedTheEnrolment();

    await whenTheRenewalIsDue();

    thenSessionIs(authentication, undefined, undefined);
  });

  it('should expose no company when durable session selection no longer exists', async () => {
    await givenAnEnrolledSession();
    givenAnotherTabRemovedTheEnrolment();

    await whenSynchronizingTheSession();

    thenSessionIs(authentication, undefined, undefined);
  });

  it.each(['renewed', 'revoked'])('should preserve another company enrolled while a previous renewal is in flight (%s)', async answer => {
    const anotherCompany = await givenAnEnrolledSessionAndCaptureAnotherCompany();

    await whenTheRenewalIsDue();
    givenAnotherCompanyHasReplacedTheStoredSession(anotherCompany);
    await whenThePreviousRenewalAnswers(answer);
    const restarted = await whenRestartingAndAttemptingRenewal();

    thenSessionIs(authentication, anotherCompanyTokenFixture, 'entreprise-b');
    thenRestartedSessionRenewsWith(restarted, 'refresh-b', anotherCompanyTokenFixture, 'entreprise-b');
  });

  it('should cancel a stalled renewal and retain the unexpired session', async () => {
    await givenAnEnrolledSession();
    await whenTheRenewalIsDue();
    const request = await whenRequestArrives(`${baseFixture}/token`);

    await whenThirtySecondsElapse();

    thenTheRequestWasCancelled(request);
    thenSessionIs(authentication, tokenFixture, 'entreprise-a');
  });

  it('should cancel a stalled logout and remove its durable credential', async () => {
    await givenAnEnrolledSession();
    const request = await whenLoggingOutWithoutAnAnswer();

    await whenThirtySecondsElapse();

    thenTheRequestWasCancelled(request);
    await whenLogoutPersistenceCompletes();
    const restarted = await whenRestartingWithoutAStoredCredential();
    thenSessionIs(restarted, undefined, 'entreprise-a');
  });

  const whenLoggingOutWithoutAnAnswer = async (): Promise<TestRequest> => {
    authentication.logout();
    return whenRequestArrives(`${baseFixture}/logout`);
  };

  const whenLogoutPersistenceCompletes = (): Promise<void> => stockage.drainIO();

  const whenThirtySecondsElapse = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(30_000);
  };

  const thenTheRequestWasCancelled = (request: TestRequest): void => {
    expect(request.cancelled).toBe(true);
  };

  interface RestartedRenewal {
    session: AuthenticationPort;
    refreshToken: string | null;
  }

  const newAuthentication = (): AuthenticationPort => TestBed.runInInjectionContext(() => new DeviceAuthentication());

  const givenATokenWith = (claims: unknown): string => jwtFixture(claims);

  const givenAnEnrolledSession = async (token = tokenFixture, expiresIn = 300): Promise<void> => {
    await whenEnrolling(token, expiresIn);
    vi.clearAllTimers();
    authentication = newAuthentication();
    await whenRestoring();
  };

  const givenAnExpiredEnrolledSession = async (): Promise<void> => {
    await whenEnrolling(tokenFixture);
    vi.clearAllTimers();
    vi.setSystemTime(Date.now() + 301_000);
    authentication = newAuthentication();
    await whenRestoring();
  };

  const givenAnEnrolledSessionAndCaptureAnotherCompany = async (): Promise<unknown> => {
    await whenEnrolling(anotherCompanyTokenFixture, 300, 'refresh-b');
    const anotherCompany = stockage.snapshot();
    stockage.clear();
    vi.clearAllTimers();
    authentication = newAuthentication();
    await whenEnrolling(tokenFixture);
    vi.clearAllTimers();
    authentication = newAuthentication();
    await whenRestoring();
    return anotherCompany;
  };

  const givenAnEnrolledSessionWithoutRestoringIt = async (): Promise<void> => {
    await whenEnrolling(tokenFixture);
    vi.clearAllTimers();
    authentication = newAuthentication();
  };

  const givenAnotherTabRenewedItsSession = async (): Promise<void> => {
    const previousSession = stockage.snapshot();
    vi.clearAllTimers();
    const anotherTab = newAuthentication();
    await whenRestoring(anotherTab);
    await whenTheRenewalIsDue();
    await whenTheServerGrantsARenewal();
    await whenRenewalPersistenceCompletes();
    const renewedSession = stockage.snapshot();
    vi.clearAllTimers();
    stockage.restore(previousSession);
    authentication = newAuthentication();
    await whenRestoring();
    stockage.restore(renewedSession);
  };

  const givenAnotherCompanyWasEnrolled = async (): Promise<void> => {
    const anotherTab = newAuthentication();
    await whenRestoring(anotherTab);
    await whenLoggingOut(anotherTab);
    await whenReenrolling(anotherTab, anotherCompanyTokenFixture, 'refresh-b', 'another-device');
  };

  const givenAnotherTabLoggedOut = async (): Promise<void> => {
    const anotherTab = newAuthentication();
    await whenRestoring(anotherTab);
    await whenLoggingOut(anotherTab);
  };

  const givenStorageCannotBeRead = (): void => {
    stockage.failRead = true;
  };

  const givenStorageCanBeReadButNotCommitted = (): void => {
    stockage.failRead = false;
    stockage.failWrite = true;
  };

  const givenTheNextStorageWriteFails = (): void => {
    stockage.failWrite = true;
  };

  const givenLogoutDuringTheNextStorageCommit = (failure = false): void => {
    stockage.failWrite = failure;
    stockage.beforeCommit = () => {
      authentication.logout();
    };
  };

  const givenAnotherCompanyReplacesTheAbandonedRenewal = (anotherCompany: unknown): void => {
    stockage.beforeCommit = () => {
      authentication.logout();
      stockage.beforeCommit = () => {
        stockage.restore(anotherCompany);
      };
    };
  };

  const givenAnotherTabRemovedTheEnrolment = (): void => {
    stockage.clear();
  };

  const givenAnotherCompanyHasReplacedTheStoredSession = (anotherCompany: unknown): void => {
    stockage.restore(anotherCompany);
  };

  const whenRestoring = async (session = authentication): Promise<void> => {
    const restoration = session.authenticate();
    await stockage.completeIOUntil(restoration);
  };

  const whenRestoringInBackground = (): Promise<void> => authentication.authenticate();

  const whenRestartingTheBrowser = async (): Promise<AuthenticationPort> => {
    vi.clearAllTimers();
    const restarted = newAuthentication();
    await whenRestoring(restarted);
    return restarted;
  };

  const whenRestartingWithoutAStoredCredential = async (): Promise<AuthenticationPort> => {
    vi.clearAllTimers();
    const restarted = newAuthentication();
    const restoration = restarted.authenticate();
    await stockage.drainIO();
    (await whenRequestArrives(`${baseFixture}/auth/device`)).error(new ProgressEvent('error'));
    await restoration;
    return restarted;
  };

  const whenRestartingAndAttemptingRenewal = async (): Promise<RestartedRenewal> => {
    const session = await whenRestartingTheBrowser();
    await whenTheRenewalIsDue();
    const request = await whenRequestArrives(`${baseFixture}/token`);
    const refreshToken = (request.request.body as HttpParams).get('refresh_token');
    request.error(new ProgressEvent('error'));
    return { session, refreshToken };
  };

  const whenStorageCompletes = async (operation: Promise<void>): Promise<void> => {
    await stockage.completeIOUntil(operation);
  };

  const whenTheRenewalIsDue = async (): Promise<void> => {
    await vi.advanceTimersToNextTimerAsync();
    await stockage.drainIO();
  };

  const whenTheServerGrantsARenewal = async (): Promise<void> => {
    (await whenRequestArrives(`${baseFixture}/token`)).flush({
      access_token: rotatedFixture,
      refresh_token: 'refresh-2',
      expires_in: 300,
    });
  };

  const whenRenewalPersistenceCompletes = (): Promise<void> => stockage.drainIO();

  const whenRenewalIsGranted = async (): Promise<void> => {
    await whenTheRenewalIsDue();
    await whenTheServerGrantsARenewal();
    await whenRenewalPersistenceCompletes();
  };

  const whenRenewalCannotReachTheServer = async (): Promise<void> => {
    await whenTheRenewalIsDue();
    (await whenRequestArrives(`${baseFixture}/token`)).error(new ProgressEvent('error'));
    await Promise.resolve();
  };

  const whenRenewalIsRevokedAndReenrolmentIsUnavailable = async (): Promise<void> => {
    await whenTheRenewalIsDue();
    (await whenRequestArrives(`${baseFixture}/token`)).flush({ error: 'invalid_grant' }, { status: 400, statusText: 'Revoked' });
    await stockage.drainIO();
    (await whenRequestArrives(`${baseFixture}/auth/device`)).error(new ProgressEvent('error'));
    await Promise.resolve();
  };

  const whenLoggingOut = async (session = authentication): Promise<void> => {
    session.logout();
    (await whenRequestArrives(`${baseFixture}/logout`)).flush({});
    await stockage.drainIO();
  };

  const whenLoggingOutBeforeRestoreCompletes = (): void => {
    authentication.logout();
  };

  const whenRenewalIsGrantedAndLogoutCompletes = async (): Promise<void> => {
    await whenTheRenewalIsDue();
    await whenTheServerGrantsARenewal();
    await stockage.drainIO();
    (await whenRequestArrives(`${baseFixture}/logout`)).flush({});
    await Promise.resolve();
  };

  const whenRenewalStartsAndTheLocalSessionLogsOut = async (): Promise<void> => {
    await vi.advanceTimersToNextTimerAsync();
    authentication.logout();
    (await whenRequestArrives(`${baseFixture}/logout`)).flush({});
    await stockage.drainIO();
  };

  const whenSynchronizingTheSession = async (): Promise<void> => {
    const synchronization = authentication.synchronizeSession();
    await stockage.completeIOUntil(synchronization);
  };

  const whenLoggingOutDuringSessionSynchronization = async (): Promise<void> => {
    const synchronization = authentication.synchronizeSession();
    authentication.logout();
    (await whenRequestArrives(`${baseFixture}/logout`)).flush({});
    await stockage.completeIOUntil(synchronization);
  };

  const whenThePreviousRenewalAnswers = async (answer: string): Promise<void> => {
    const request = await whenRequestArrives(`${baseFixture}/token`);
    if (answer === 'renewed') {
      request.flush({ access_token: rotatedFixture, refresh_token: 'refresh-2', expires_in: 300 });
    } else {
      request.flush({ error: 'invalid_grant' }, { status: 400, statusText: 'Revoked' });
    }
    await stockage.drainIO();
  };

  const whenEnrolling = async (
    access_token: string,
    expires_in = 300,
    refresh_token = 'refresh-1',
    session = authentication,
    deviceCode = 'device',
  ): Promise<void> => completeEnrolment(session, access_token, expires_in, refresh_token, deviceCode, true);

  const whenReenrolling = async (
    session: AuthenticationPort,
    accessToken: string,
    refreshToken: string,
    deviceCode: string,
  ): Promise<void> => completeEnrolment(session, accessToken, 300, refreshToken, deviceCode, false);

  const completeEnrolment = async (
    session: AuthenticationPort,
    access_token: string,
    expires_in: number,
    refresh_token: string,
    deviceCode: string,
    restoresFromStorage: boolean,
  ): Promise<void> => {
    const enrolment = session.authenticate();
    if (restoresFromStorage) {
      await stockage.drainIO();
    }
    (await whenRequestArrives(`${baseFixture}/auth/device`)).flush({ device_code: deviceCode, interval: 0 });
    await vi.advanceTimersToNextTimerAsync();
    (await whenRequestArrives(`${baseFixture}/token`)).flush({ access_token, refresh_token, expires_in });
    await stockage.completeIOUntil(enrolment);
  };

  const whenRequestArrives = async (url: string): Promise<TestRequest> => {
    await afterMicrotasks();
    return http.expectOne(url);
  };

  const thenSessionIs = (session: AuthenticationPort, token: string | undefined, tenant: string | undefined): void => {
    expect(session.currentToken()).toBe(token);
    expect(session.currentTenant()).toBe(tenant);
  };

  const thenRestartedSessionRenewsWith = (restarted: RestartedRenewal, refreshToken: string, token: string, tenant: string): void => {
    thenSessionIs(restarted.session, token, tenant);
    expect(restarted.refreshToken).toBe(refreshToken);
  };
});

describe('Device enrolment lifecycle, through DeviceEnrolmentPort', () => {
  const verificationUriFixture = 'http://keycloak.test/realms/glm/device';
  const deviceAuthorizationFixture = {
    device_code: 'device',
    user_code: 'WDJB-MJHT',
    verification_uri: verificationUriFixture,
    verification_uri_complete: `${verificationUriFixture}?user_code=WDJB-MJHT`,
    expires_in: 600,
    interval: 0,
  };
  const grantedTokensFixture = { access_token: tokenFixture, refresh_token: 'refresh-1', expires_in: 300 };
  const refusalsFixture: [string, DeviceEnrolmentOutcome][] = [
    ['access_denied', 'DENIED'],
    ['expired_token', 'EXPIRED'],
    ['invalid_client', 'UNREACHABLE'],
  ];

  let device: DeviceAuthentication;
  let enrolment: DeviceEnrolmentPort;
  let stockage: StorageFixture;
  let http: HttpTestingController;
  let codesShown: DeviceAuthorizationCode[];

  beforeEach(() => {
    vi.useFakeTimers();
    stockage = new StorageFixture();
    codesShown = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DeviceGrantClient,
        DeviceAuthentication,
        { provide: DeviceGrantConfiguration, useValue: new DeviceGrantConfiguration('http://keycloak.test', 'glm', 'pupitre') },
        { provide: LocalStoragePort, useValue: stockage },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
    device = TestBed.inject(DeviceAuthentication);
    enrolment = device;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should show the code to approve, then report the device enrolled once its tokens are granted', async () => {
    const outcome = whenEnrolling();

    await whenTheServerIssuesTheCode();

    thenTheCodeShownIs({
      userCode: 'WDJB-MJHT',
      verificationUri: verificationUriFixture,
      verificationUriComplete: `${verificationUriFixture}?user_code=WDJB-MJHT`,
      expiresIn: 600,
    });

    await whenTheServerGrantsTheTokens();

    await thenTheOutcomeIs(outcome, 'ENROLLED');
  });

  it.each(refusalsFixture)('should report the %s refusal as %s', async (refusal, expected) => {
    const outcome = whenEnrolling();

    await whenTheServerIssuesTheCode();
    await whenTheServerRefusesTheClaim(refusal);

    await thenTheOutcomeIs(outcome, expected);
  });

  it('should report an unreachable server when no code can be obtained', async () => {
    const outcome = whenEnrolling();

    await whenTheAuthorizationRequestFails();

    await thenTheOutcomeIs(outcome, 'UNREACHABLE');
    thenNoCodeWasShown();
  });

  it('should report an unreachable server when the granted session cannot be committed', async () => {
    givenStorageCannotCommit();

    const outcome = whenEnrolling();
    await whenTheServerIssuesTheCode();
    await whenTheServerGrantsTheTokens();

    await thenTheOutcomeIs(outcome, 'UNREACHABLE');
  });

  it('should report an unreachable server when the durable enrolment cannot be read', async () => {
    givenStorageCannotBeRead();

    const outcome = whenEnrolling();

    await thenTheOutcomeIs(outcome, 'UNREACHABLE');
    thenNoCodeWasShown();
  });

  it('should abandon an enrolment replaced while its code was still being claimed', async () => {
    const outcome = whenEnrolling();
    await whenTheServerIssuesTheCode();

    await whenTheEnrolmentIsAbandoned();

    await thenTheOutcomeIs(outcome, 'ABANDONED');
  });

  it('should report the device enrolled from its durable session without showing a code', async () => {
    await givenADurableEnrolment();

    const outcome = whenEnrolling();

    await thenTheOutcomeIs(outcome, 'ENROLLED');
    thenNoCodeWasShown();
  });

  it('should cancel a stalled authorization and report the server unreachable', async () => {
    const outcome = whenEnrolling();
    const request = await whenAuthorizationStalls();

    await whenThirtySecondsElapse();

    thenTheRequestWasCancelled(request);
    await thenTheOutcomeIs(outcome, 'UNREACHABLE');
    thenNoCodeWasShown();
  });

  it('should cancel a stalled token claim and report the server unreachable', async () => {
    const outcome = whenEnrolling();
    await whenTheServerIssuesTheCode();
    const request = await whenTokenClaimStalls();

    await whenThirtySecondsElapse();

    thenTheRequestWasCancelled(request);
    await thenTheOutcomeIs(outcome, 'UNREACHABLE');
  });

  const whenAuthorizationStalls = async (): Promise<TestRequest> => {
    await stockage.drainIO();
    return whenRequestArrives(`${baseFixture}/auth/device`);
  };

  const whenTokenClaimStalls = async (): Promise<TestRequest> => {
    await vi.advanceTimersToNextTimerAsync();
    return whenRequestArrives(`${baseFixture}/token`);
  };

  const whenThirtySecondsElapse = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(30_000);
  };

  const thenTheRequestWasCancelled = (request: TestRequest): void => {
    expect(request.cancelled).toBe(true);
  };

  const givenStorageCannotCommit = (): void => {
    stockage.failWrite = true;
  };

  const givenStorageCannotBeRead = (): void => {
    stockage.failRead = true;
  };

  const givenADurableEnrolment = async (): Promise<void> => {
    const first = whenEnrolling();
    await whenTheServerIssuesTheCode();
    await whenTheServerGrantsTheTokens();
    await stockage.completeIOUntil(first);
    vi.clearAllTimers();
    codesShown = [];
    device = TestBed.runInInjectionContext(() => new DeviceAuthentication());
    enrolment = device;
  };

  const whenEnrolling = (): Promise<DeviceEnrolmentOutcome> =>
    enrolment.enrol(code => {
      codesShown.push(code);
    });

  const whenTheServerIssuesTheCode = async (): Promise<void> => {
    await stockage.drainIO();
    (await whenRequestArrives(`${baseFixture}/auth/device`)).flush(deviceAuthorizationFixture);
  };

  const whenTheAuthorizationRequestFails = async (): Promise<void> => {
    await stockage.drainIO();
    (await whenRequestArrives(`${baseFixture}/auth/device`)).error(new ProgressEvent('error'));
  };

  const whenTheServerGrantsTheTokens = async (): Promise<void> => {
    await vi.advanceTimersToNextTimerAsync();
    (await whenRequestArrives(`${baseFixture}/token`)).flush(grantedTokensFixture);
  };

  const whenTheServerRefusesTheClaim = async (refusal: string): Promise<void> => {
    await vi.advanceTimersToNextTimerAsync();
    (await whenRequestArrives(`${baseFixture}/token`)).flush({ error: refusal }, { status: 400, statusText: 'Refused' });
  };

  const whenTheEnrolmentIsAbandoned = async (): Promise<void> => {
    device.logout();
    await vi.advanceTimersToNextTimerAsync();
  };

  const whenRequestArrives = async (url: string): Promise<TestRequest> => {
    await afterMicrotasks();
    return http.expectOne(url);
  };

  const thenTheCodeShownIs = (expected: DeviceAuthorizationCode): void => {
    expect(codesShown).toEqual([expected]);
  };

  const thenNoCodeWasShown = (): void => {
    expect(codesShown).toEqual([]);
  };

  const thenTheOutcomeIs = async (outcome: Promise<DeviceEnrolmentOutcome>, expected: DeviceEnrolmentOutcome): Promise<void> => {
    expect(await stockage.completeIOUntil(outcome)).toBe(expected);
  };
});