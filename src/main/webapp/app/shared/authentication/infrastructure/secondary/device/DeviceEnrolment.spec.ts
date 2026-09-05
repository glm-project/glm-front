import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { StockageLocalPort } from '@/app/shared/stockage-local/domain/StockageLocalPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DeviceAuthentication } from './DeviceAuthentication';
import { DeviceGrantConfiguration } from './DeviceGrantConfiguration';

const baseFixture = 'http://keycloak.test/realms/glm/protocol/openid-connect';
const jwtFixture = (claims: unknown): string => `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify(claims))}.signature`;
const tokenFixture = jwtFixture({ tenant: 'entreprise-a' });
const rotatedFixture = jwtFixture({ tenant: 'entreprise-a', version: 2 });
const sessionFixture = { accessToken: tokenFixture, refreshToken: 'refresh-1', expiresAt: Date.now() + 300_000, tenant: 'entreprise-a' };

class StockageFixture extends StockageLocalPort {
  value: unknown;
  failRead = false;
  failWrite = false;
  beforeCommit: (() => void) | undefined;
  private readonly tails = new Map<string, Promise<void>>();

  override async read<T>(): Promise<T | undefined> {
    await new Promise(resolve => setTimeout(resolve, 1));
    if (this.failRead) {
      throw new Error('lecture impossible');
    }
    return structuredClone(this.value) as T | undefined;
  }
  override async update<T>(_key: string, initial: T, change: (value: T) => T): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 1));
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
}

describe('Persistent device enrolment, through AuthenticationPort', () => {
  let authentication: AuthenticationPort;
  let stockage: StockageFixture;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    stockage = new StockageFixture();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DeviceAuthentication,
        { provide: DeviceGrantConfiguration, useValue: new DeviceGrantConfiguration('http://keycloak.test', 'glm', 'pupitre') },
        { provide: StockageLocalPort, useValue: stockage },
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

    const restarted = TestBed.runInInjectionContext(() => new DeviceAuthentication());
    const boot = restarted.authenticate();
    await vi.advanceTimersByTimeAsync(1);
    await boot;

    thenSessionIs(restarted, tokenFixture, 'entreprise-a');
  });

  it('should preserve the company when restarting with an expired token and no network', async () => {
    givenSession({ ...sessionFixture, expiresAt: 0 });
    await whenRestoring();

    await whenRenewing();
    http.expectOne(`${baseFixture}/token`).error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(1);

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should commit rotating refresh credentials before exposing a renewed token', async () => {
    givenSession(sessionFixture);
    await whenRestoring();

    await whenRenewing();
    http.expectOne(`${baseFixture}/token`).flush({ access_token: rotatedFixture, refresh_token: 'refresh-2', expires_in: 300 });
    thenSessionIs(authentication, tokenFixture, 'entreprise-a');
    await vi.advanceTimersByTimeAsync(1);

    thenSessionIs(authentication, rotatedFixture, 'entreprise-a');
    thenPersistedRefreshIs('refresh-2');
  });

  it('should adopt a refresh already rotated by another tab before renewing', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    givenSession({ ...sessionFixture, accessToken: rotatedFixture, refreshToken: 'refresh-2' });

    await whenRenewing();

    thenSessionIs(authentication, rotatedFixture, 'entreprise-a');
  });

  it('should retain the company while requiring a new enrolment after revocation', async () => {
    givenSession(sessionFixture);
    await whenRestoring();

    await whenRenewing();
    http.expectOne(`${baseFixture}/token`).flush({ error: 'invalid_grant' }, { status: 400, statusText: 'Revoked' });
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${baseFixture}/auth/device`).error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(1);

    thenSessionIs(authentication, undefined, 'entreprise-a');
    thenPersistedRefreshIs(undefined);
  });

  it('should clear durable credentials on logout without deleting the selected company', async () => {
    givenSession(sessionFixture);
    await whenRestoring();

    authentication.logout();
    http.expectOne(`${baseFixture}/logout`).flush({});
    await vi.advanceTimersByTimeAsync(1);

    thenSessionIs(authentication, undefined, 'entreprise-a');
    thenPersistedRefreshIs(undefined);
  });

  it('should expose no session when storage cannot be read or committed', async () => {
    stockage.failRead = true;
    const boot = authentication.authenticate();
    await vi.advanceTimersByTimeAsync(1);
    await boot;
    thenSessionIs(authentication, undefined, undefined);
    stockage.failRead = false;
    stockage.failWrite = true;

    await whenEnrolling(tokenFixture);

    thenSessionIs(authentication, undefined, undefined);
  });

  it('should keep the last committed access token when persisting a renewal fails', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    stockage.failWrite = true;

    await whenRenewing();
    http.expectOne(`${baseFixture}/token`).flush({ access_token: rotatedFixture, refresh_token: 'refresh-2', expires_in: 300 });
    await vi.advanceTimersByTimeAsync(1);

    thenSessionIs(authentication, tokenFixture, 'entreprise-a');
  });

  it.each([null, {}, { tenant: 12 }, { tenant: '' }, 'claims'])(
    'should never invent a company absent from the token (%j)',
    async claims => {
      await whenEnrolling(jwtFixture(claims));

      thenSessionIs(authentication, jwtFixture(claims), undefined);
    },
  );

  it('should report an unsuccessful durable logout', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    stockage.failWrite = true;

    authentication.logout();
    http.expectOne(`${baseFixture}/logout`).flush({});
    await vi.advanceTimersByTimeAsync(1);

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should not restore a session whose boot was abandoned during the disk read', async () => {
    givenSession(sessionFixture);
    const boot = authentication.authenticate();

    authentication.logout();
    await vi.advanceTimersByTimeAsync(2);
    await boot;

    thenSessionIs(authentication, undefined, undefined);
  });

  it('should not expose a granted session when logout happens during its durable commit', async () => {
    stockage.beforeCommit = () => authentication.logout();

    await whenEnrolling(tokenFixture);
    await vi.advanceTimersByTimeAsync(1);

    thenSessionIs(authentication, undefined, undefined);
    thenPersistedRefreshIs(undefined);
  });

  it.each([false, true])('should not resurrect a session abandoned during renewal persistence (failure %s)', async failure => {
    givenSession(sessionFixture);
    await whenRestoring();
    stockage.failWrite = failure;
    stockage.beforeCommit = () => authentication.logout();

    await whenRenewing();
    http.expectOne(`${baseFixture}/token`).flush({ access_token: rotatedFixture, refresh_token: 'refresh-2', expires_in: 300 });
    await vi.advanceTimersByTimeAsync(2);
    http.expectOne(`${baseFixture}/logout`).flush({});

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should not adopt another tab’s renewal after local logout', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    givenSession({ ...sessionFixture, accessToken: rotatedFixture, refreshToken: 'refresh-2' });

    await vi.advanceTimersByTimeAsync(5_000);
    authentication.logout();
    http.expectOne(`${baseFixture}/logout`).flush({});
    await vi.advanceTimersByTimeAsync(2);

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should adopt another company selected in a different tab before exchanging data', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    givenSession({ ...sessionFixture, tenant: 'entreprise-b', accessToken: jwtFixture({ tenant: 'entreprise-b' }) });

    const sync = authentication.synchronizeSession();
    await vi.advanceTimersByTimeAsync(1);
    await sync;

    thenSessionIs(authentication, jwtFixture({ tenant: 'entreprise-b' }), 'entreprise-b');
  });

  it('should clear credentials revoked in another tab while retaining its company', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    stockage.value = { tenant: 'entreprise-a' };

    const sync = authentication.synchronizeSession();
    await vi.advanceTimersByTimeAsync(1);
    await sync;

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should leave a synchronized session unchanged', async () => {
    givenSession(sessionFixture);
    await whenRestoring();

    const sync = authentication.synchronizeSession();
    await vi.advanceTimersByTimeAsync(1);
    await sync;

    thenSessionIs(authentication, tokenFixture, 'entreprise-a');
  });

  it('should discard a cross-tab session read abandoned by a local logout', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    const sync = authentication.synchronizeSession();

    authentication.logout();
    http.expectOne(`${baseFixture}/logout`).flush({});
    await vi.advanceTimersByTimeAsync(2);
    await sync;

    thenSessionIs(authentication, undefined, 'entreprise-a');
  });

  it('should make no refresh request after another tab removed the enrolment', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    stockage.value = undefined;

    await whenRenewing();

    thenSessionIs(authentication, undefined, undefined);
  });

  it('should expose no company when durable session selection no longer exists', async () => {
    givenSession(sessionFixture);
    await whenRestoring();
    stockage.value = undefined;

    const sync = authentication.synchronizeSession();
    await vi.advanceTimersByTimeAsync(1);
    await sync;

    thenSessionIs(authentication, undefined, undefined);
  });

  it.each(['renewed', 'revoked'])('should preserve another company enrolled while a previous renewal is in flight (%s)', async answer => {
    givenSession(sessionFixture);
    await whenRestoring();
    await whenRenewing();
    givenSession({
      ...sessionFixture,
      tenant: 'entreprise-b',
      accessToken: jwtFixture({ tenant: 'entreprise-b' }),
      refreshToken: 'refresh-b',
    });

    const request = http.expectOne(`${baseFixture}/token`);
    if (answer === 'renewed') {
      request.flush({ access_token: rotatedFixture, refresh_token: 'refresh-2', expires_in: 300 });
    } else {
      request.flush({ error: 'invalid_grant' }, { status: 400, statusText: 'Revoked' });
    }
    await vi.advanceTimersByTimeAsync(2);

    thenSessionIs(authentication, jwtFixture({ tenant: 'entreprise-b' }), 'entreprise-b');
    thenPersistedRefreshIs('refresh-b');
  });

  const givenSession = (session: typeof sessionFixture): void => {
    stockage.value = { session, tenant: session.tenant };
  };
  const whenRestoring = async (): Promise<void> => {
    const boot = authentication.authenticate();
    await vi.advanceTimersByTimeAsync(1);
    await boot;
  };
  const whenRenewing = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(5_001);
  };
  const whenEnrolling = async (access_token: string): Promise<void> => {
    const boot = authentication.authenticate();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${baseFixture}/auth/device`).flush({ device_code: 'device', interval: 0 });
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${baseFixture}/token`).flush({ access_token, refresh_token: 'refresh-1', expires_in: 300 });
    await vi.advanceTimersByTimeAsync(1);
    await boot;
  };
  const thenSessionIs = (session: AuthenticationPort, token: string | undefined, tenant: string | undefined): void => {
    expect(session.currentToken()).toBe(token);
    expect(session.currentTenant()).toBe(tenant);
  };
  const thenPersistedRefreshIs = (token: string | undefined): void => {
    expect((stockage.value as { session?: { refreshToken: string } }).session?.refreshToken).toBe(token);
  };
});
