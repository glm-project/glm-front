import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import Keycloak from 'keycloak-js';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { MockInstance } from 'vitest';
import { DeviceAuthentication } from './device/DeviceAuthentication';
import { DeviceGrantConfiguration } from './device/DeviceGrantConfiguration';
import { IN_MEMORY_TOKEN, InMemoryAuthentication } from './in-memory/InMemoryAuthentication';
import { KeycloakOidcAuthentication } from './keycloak-oidc/KeycloakOidcAuthentication';

const KEYCLOAK_TOKEN = '1a2b3c';
const RENEWED_KEYCLOAK_TOKEN = '4d5e6f';

type RefreshOutcome = 'renews' | 'keeps' | 'fails';

interface KeycloakSession {
  opensSession?: boolean;
  refresh?: RefreshOutcome;
}

const afterARoundTrip = <T>(outcome: () => Promise<T>): Promise<T> => new Promise<void>(resolve => setTimeout(resolve)).then(outcome);

const keycloakSessionFixture = ({ opensSession = true, refresh = 'keeps' }: KeycloakSession = {}): Keycloak => {
  let token: string | undefined;

  const refreshOutcomes: Record<RefreshOutcome, () => Promise<boolean>> = {
    renews: () =>
      afterARoundTrip(() => {
        token = RENEWED_KEYCLOAK_TOKEN;
        return Promise.resolve(true);
      }),
    keeps: () => afterARoundTrip(() => Promise.resolve(false)),
    fails: () => afterARoundTrip(() => Promise.reject(new Error('refresh refused'))),
  };

  return {
    init: () =>
      afterARoundTrip(() => {
        token = opensSession ? KEYCLOAK_TOKEN : undefined;
        return Promise.resolve(opensSession);
      }),
    updateToken: refreshOutcomes[refresh],
    logout: () => {
      token = undefined;
      return Promise.resolve();
    },
    get token() {
      return token;
    },
  } as unknown as Keycloak;
};

const KEYCLOAK_URL = 'http://keycloak.test';
const REALM = 'glmproject';
const DEVICE_CLIENT_ID = 'pupitre_device';
const OPENID_CONNECT = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect`;
const DEVICE_CODE = 'a-device-code';
const DEVICE_TOKEN = 'device-token';
const RENEWED_DEVICE_TOKEN = 'renewed-device-token';
const OFFLINE_REFRESH_TOKEN = 'offline-refresh-token';
const TOKEN_LIFETIME_SECONDS = 300;
const EVERY_RENEWAL = Number.POSITIVE_INFINITY;
const NO_POLL_DELAY = 0;

interface AuthorizationServerBehaviour {
  unreachable?: boolean;
  namesNoPollingPace?: boolean;
  pendingPolls?: number;
  slowsDownOnce?: boolean;
  refusesWith?: string;
  answersWithoutAReason?: boolean;
  refusedRenewals?: number;
  holdsTheGrant?: boolean;
  holdsTheRenewal?: boolean;
  refusesToEndTheSession?: boolean;
}

const NOTHING_UNUSUAL: AuthorizationServerBehaviour = {};

type ServerAnswer = HttpEvent<unknown> | HttpErrorResponse;

const anAnswerFixture = (body: unknown): ServerAnswer => new HttpResponse({ status: 200, body });

const aRefusalFixture = (error: string): ServerAnswer => new HttpErrorResponse({ status: 400, error: { error } });

const aNetworkFailureFixture = (): ServerAnswer => new HttpErrorResponse({ status: 0, error: null });

const onceTheRequestHasTravelled = (answer: ServerAnswer): Promise<ServerAnswer> => afterARoundTrip(() => Promise.resolve(answer));

const tokensFixture = (accessToken: string): unknown => ({
  access_token: accessToken,
  refresh_token: OFFLINE_REFRESH_TOKEN,
  expires_in: TOKEN_LIFETIME_SECONDS,
});

class AuthorizationServerFixture implements HttpBackend {
  sessionsEnded = 0;

  private polls = 0;
  private renewals = 0;
  private releaseTheHeldRequest: () => void = () => undefined;
  private readonly heldRequest: Promise<void>;

  constructor(private readonly behaviour: AuthorizationServerBehaviour) {
    this.heldRequest = new Promise<void>(resolve => {
      this.releaseTheHeldRequest = resolve;
    });
  }

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  answerTheHeldRequest(): void {
    this.releaseTheHeldRequest();
  }

  private answer(request: HttpRequest<unknown>): Promise<ServerAnswer> {
    const form = new URLSearchParams(request.serializeBody() as string);

    if (request.url === `${OPENID_CONNECT}/auth/device`) {
      return this.authorizeTheDevice(form);
    }
    if (request.url === `${OPENID_CONNECT}/logout`) {
      return this.endTheSession(form);
    }
    return this.deliverTokens(form);
  }

  private authorizeTheDevice(form: URLSearchParams): Promise<ServerAnswer> {
    if (this.behaviour.unreachable === true) {
      return onceTheRequestHasTravelled(aNetworkFailureFixture());
    }
    if (form.get('client_id') !== DEVICE_CLIENT_ID) {
      return onceTheRequestHasTravelled(aRefusalFixture('invalid_client'));
    }
    if (!(form.get('scope') ?? '').includes('offline_access')) {
      return onceTheRequestHasTravelled(aRefusalFixture('invalid_scope'));
    }
    return onceTheRequestHasTravelled(
      anAnswerFixture({
        device_code: DEVICE_CODE,
        user_code: 'WXYZ-ABCD',
        verification_uri: `${OPENID_CONNECT}/auth/device`,
        expires_in: 600,
        ...(this.behaviour.namesNoPollingPace === true ? {} : { interval: NO_POLL_DELAY }),
      }),
    );
  }

  private deliverTokens(form: URLSearchParams): Promise<ServerAnswer> {
    if (form.get('grant_type') === 'refresh_token') {
      return this.renewTheSession(form);
    }
    return this.grantOnTheDeviceCode(form);
  }

  private async grantOnTheDeviceCode(form: URLSearchParams): Promise<ServerAnswer> {
    this.polls += 1;
    const refused = this.behaviour.refusesWith;

    if (this.behaviour.holdsTheGrant === true) {
      await this.heldRequest;
    }
    if (this.behaviour.answersWithoutAReason === true) {
      return onceTheRequestHasTravelled(aNetworkFailureFixture());
    }
    if (refused !== undefined) {
      return onceTheRequestHasTravelled(aRefusalFixture(refused));
    }
    if (form.get('device_code') !== DEVICE_CODE) {
      return onceTheRequestHasTravelled(aRefusalFixture('invalid_grant'));
    }
    if (this.polls === 1 && this.behaviour.slowsDownOnce === true) {
      return onceTheRequestHasTravelled(aRefusalFixture('slow_down'));
    }
    if (this.polls <= (this.behaviour.pendingPolls ?? 0)) {
      return onceTheRequestHasTravelled(aRefusalFixture('authorization_pending'));
    }
    return onceTheRequestHasTravelled(anAnswerFixture(tokensFixture(DEVICE_TOKEN)));
  }

  private async renewTheSession(form: URLSearchParams): Promise<ServerAnswer> {
    this.renewals += 1;

    if (this.behaviour.holdsTheRenewal === true) {
      await this.heldRequest;
    }
    if (form.get('refresh_token') !== OFFLINE_REFRESH_TOKEN) {
      return onceTheRequestHasTravelled(aRefusalFixture('invalid_grant'));
    }
    if (this.renewals <= (this.behaviour.refusedRenewals ?? 0)) {
      return onceTheRequestHasTravelled(aRefusalFixture('invalid_grant'));
    }
    return onceTheRequestHasTravelled(anAnswerFixture(tokensFixture(RENEWED_DEVICE_TOKEN)));
  }

  private endTheSession(form: URLSearchParams): Promise<ServerAnswer> {
    if (this.behaviour.refusesToEndTheSession === true) {
      return onceTheRequestHasTravelled(aNetworkFailureFixture());
    }
    if (form.get('refresh_token') !== OFFLINE_REFRESH_TOKEN) {
      return onceTheRequestHasTravelled(aRefusalFixture('invalid_grant'));
    }
    this.sessionsEnded += 1;
    return onceTheRequestHasTravelled(new HttpResponse({ status: 204 }));
  }
}

const anAuthorizationServerFixture = (behaviour: AuthorizationServerBehaviour = NOTHING_UNUSUAL): AuthorizationServerFixture =>
  new AuthorizationServerFixture(behaviour);

const buildInMemoryAuthentication = (): AuthenticationPort =>
  Injector.create({ providers: [InMemoryAuthentication] }).get(InMemoryAuthentication);

const buildKeycloakAuthentication = (keycloak: Keycloak): AuthenticationPort =>
  Injector.create({ providers: [{ provide: Keycloak, useValue: keycloak }, KeycloakOidcAuthentication] }).get(KeycloakOidcAuthentication);

const buildDeviceAuthentication = (server: HttpBackend): AuthenticationPort =>
  Injector.create({
    providers: [
      { provide: HttpBackend, useValue: server },
      { provide: DeviceGrantConfiguration, useValue: new DeviceGrantConfiguration(KEYCLOAK_URL, REALM, DEVICE_CLIENT_ID) },
      DeviceAuthentication,
    ],
  }).get(DeviceAuthentication);

const adapters: [string, () => AuthenticationPort, string][] = [
  ['in-memory', buildInMemoryAuthentication, IN_MEMORY_TOKEN],
  ['keycloak-oidc', () => buildKeycloakAuthentication(keycloakSessionFixture()), KEYCLOAK_TOKEN],
  ['device', () => buildDeviceAuthentication(anAuthorizationServerFixture()), DEVICE_TOKEN],
];

describe.each(adapters)('AuthenticationPort contract, honoured by %s', (_adapter, buildAuthentication, sessionToken) => {
  let authentication: AuthenticationPort;

  beforeEach(() => {
    authentication = buildAuthentication();
  });

  it('should hold no token before the session is opened', () => {
    expect(authentication.currentToken()).toBeUndefined();
  });

  it('should hand over the token of the open session', async () => {
    await authentication.authenticate();

    expect(authentication.currentToken()).toEqual(sessionToken);
  });

  it('should hand over nothing again once the session is ended', async () => {
    await authentication.authenticate();

    authentication.logout();

    expect(authentication.currentToken()).toBeUndefined();
  });
});

describe('Keycloak OIDC Authentication, beyond the contract', () => {
  const originalLocation = window.location;
  let consoleErrorFixture: MockInstance;

  beforeEach(() => {
    consoleErrorFixture = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    Object.defineProperty(window, 'location', { value: { reload: vi.fn() }, configurable: true });
  });

  afterEach(() => {
    consoleErrorFixture.mockRestore();
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
  });

  it('should reload the window when Keycloak opens no session', async () => {
    const authentication = buildKeycloakAuthentication(keycloakSessionFixture({ opensSession: false }));

    await authentication.authenticate();

    expect(authentication.currentToken()).toBeUndefined();
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should hand over the renewed token once the session has refreshed', async () => {
    const authentication = buildKeycloakAuthentication(keycloakSessionFixture({ refresh: 'renews' }));

    await authentication.authenticate();

    expect(authentication.currentToken()).toEqual(RENEWED_KEYCLOAK_TOKEN);
  });

  it('should keep handing over the token it had when the refresh fails', async () => {
    const authentication = buildKeycloakAuthentication(keycloakSessionFixture({ refresh: 'fails' }));

    await authentication.authenticate();

    expect(authentication.currentToken()).toEqual(KEYCLOAK_TOKEN);
  });
});

describe('Device Authentication, beyond the contract', () => {
  const A_TICK = 1000;
  const A_SLOWER_PACE = 6 * 1000;
  const A_SHIFT = 10 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const enrolWhileTimePasses = async (authentication: AuthenticationPort, milliseconds: number): Promise<void> => {
    const enrolment = authentication.authenticate();

    await vi.advanceTimersByTimeAsync(milliseconds);

    return enrolment;
  };

  const givenAnEnrolledPupitre = async (authentication: AuthenticationPort): Promise<void> => enrolWhileTimePasses(authentication, A_TICK);

  const whenEnrolling = async (authentication: AuthenticationPort): Promise<void> => enrolWhileTimePasses(authentication, A_TICK);

  const whenEnrollingAtTheSlowerPace = async (authentication: AuthenticationPort): Promise<void> =>
    enrolWhileTimePasses(authentication, A_SLOWER_PACE);

  const whenTheShiftGoesOn = (): Promise<void> => vi.advanceTimersByTimeAsync(A_SHIFT).then(() => undefined);

  const whenTheRequestHasLeft = (): Promise<void> => vi.advanceTimersByTimeAsync(A_TICK).then(() => undefined);

  const whenTheSlowerPaceHasPassed = (): Promise<void> => vi.advanceTimersByTimeAsync(A_SLOWER_PACE).then(() => undefined);

  const whenEnrolmentHasBegun = (authentication: AuthenticationPort): Promise<void> => {
    void authentication.authenticate();

    return whenTheRequestHasLeft();
  };

  const whenTheHeldRequestAnswers = (server: AuthorizationServerFixture): Promise<void> => {
    server.answerTheHeldRequest();

    return whenTheRequestHasLeft();
  };

  it('should keep asking for as long as nobody has typed the code', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ pendingPolls: 2 }));

    await whenEnrolling(authentication);

    expect(authentication.currentToken()).toEqual(DEVICE_TOKEN);
  });

  it('should still enrol once it has been asked to slow down', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ slowsDownOnce: true }));

    await whenEnrollingAtTheSlowerPace(authentication);

    expect(authentication.currentToken()).toEqual(DEVICE_TOKEN);
  });

  it('should hold its first claim back to the pace RFC 8628 sets when the server names none', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ namesNoPollingPace: true }));

    await whenEnrolmentHasBegun(authentication);

    expect(authentication.currentToken()).toBeUndefined();

    await whenTheSlowerPaceHasPassed();

    expect(authentication.currentToken()).toEqual(DEVICE_TOKEN);
  });

  it.each(['access_denied', 'expired_token'])('should hand over nothing when the enrolment is refused with %s', async refusal => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ refusesWith: refusal }));

    await whenEnrolling(authentication);

    expect(authentication.currentToken()).toBeUndefined();
  });

  it('should hand over nothing when the refusal carries no reason to read', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ answersWithoutAReason: true }));

    await whenEnrolling(authentication);

    expect(authentication.currentToken()).toBeUndefined();
  });

  it('should hand over nothing when the authorization server cannot be reached', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ unreachable: true }));

    await whenEnrolling(authentication);

    expect(authentication.currentToken()).toBeUndefined();
  });

  it('should hand over a renewed token before the enrolled one expires', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture());

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    expect(authentication.currentToken()).toEqual(RENEWED_DEVICE_TOKEN);
  });

  it('should hand over nothing while the renewal keeps being refused', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ refusedRenewals: EVERY_RENEWAL }));

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    expect(authentication.currentToken()).toBeUndefined();
  });

  it('should hand over a renewed token once the network is back', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ refusedRenewals: 1 }));

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    expect(authentication.currentToken()).toEqual(RENEWED_DEVICE_TOKEN);
  });

  it('should tell the authorization server to end the session it opened', async () => {
    const server = anAuthorizationServerFixture();
    const authentication = buildDeviceAuthentication(server);

    await givenAnEnrolledPupitre(authentication);

    authentication.logout();
    await whenTheRequestHasLeft();

    expect(server.sessionsEnded).toEqual(1);
  });

  it('should tell the authorization server nothing when no session was ever opened', async () => {
    const server = anAuthorizationServerFixture();
    const authentication = buildDeviceAuthentication(server);

    authentication.logout();
    await whenTheRequestHasLeft();

    expect(server.sessionsEnded).toEqual(0);
  });

  it('should end the session locally even when the authorization server cannot be told', async () => {
    const authentication = buildDeviceAuthentication(anAuthorizationServerFixture({ refusesToEndTheSession: true }));

    await givenAnEnrolledPupitre(authentication);

    authentication.logout();
    await whenTheRequestHasLeft();

    expect(authentication.currentToken()).toBeUndefined();
  });

  it('should hand over nothing once the session is ended, even with a renewal already in flight', async () => {
    const server = anAuthorizationServerFixture({ holdsTheRenewal: true });
    const authentication = buildDeviceAuthentication(server);

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    authentication.logout();
    await whenTheHeldRequestAnswers(server);

    expect(authentication.currentToken()).toBeUndefined();
  });

  it('should hand over nothing once the enrolment is abandoned, even with a claim already in flight', async () => {
    const server = anAuthorizationServerFixture({ holdsTheGrant: true });
    const authentication = buildDeviceAuthentication(server);

    await whenEnrolmentHasBegun(authentication);

    authentication.logout();
    await whenTheHeldRequestAnswers(server);

    expect(authentication.currentToken()).toBeUndefined();
  });
});
