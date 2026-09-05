import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
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
const DEVICE_AUTHORIZATION_ENDPOINT = `${OPENID_CONNECT}/auth/device`;
const TOKEN_ENDPOINT = `${OPENID_CONNECT}/token`;
const LOGOUT_ENDPOINT = `${OPENID_CONNECT}/logout`;
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const REFRESH_TOKEN_GRANT = 'refresh_token';
const DEVICE_CODE = 'a-device-code';
const DEVICE_TOKEN = 'device-token';
const RENEWED_DEVICE_TOKEN = 'renewed-device-token';
const RE_ENROLLED_DEVICE_TOKEN = 're-enrolled-device-token';
const OFFLINE_REFRESH_TOKEN = 'offline-refresh-token';
const TOKEN_LIFETIME_SECONDS = 300;
const DEVICE_CODE_LIFETIME_SECONDS = 600;
const NO_POLL_DELAY = 0;
const NO_PACE_NAMED = undefined;
const NO_LIFETIME_NAMED = undefined;
const A_LIFETIME_ALREADY_SPENT = 0;

type ServerAnswer = HttpEvent<unknown> | HttpErrorResponse;

type ServerTurn = () => ServerAnswer;

const anAnswerFixture = (body: unknown): ServerAnswer => new HttpResponse({ status: 200, body });

const aRefusalFixture = (error: string): ServerAnswer => new HttpErrorResponse({ status: 400, error: { error } });

const aNetworkFailureFixture = (): ServerAnswer => new HttpErrorResponse({ status: 0, error: null });

const onceTheRequestHasTravelled = (answer: ServerAnswer): Promise<ServerAnswer> => afterARoundTrip(() => Promise.resolve(answer));

const tokensFixture = (accessToken: string, lifetimeSeconds: number | undefined): unknown => ({
  access_token: accessToken,
  refresh_token: OFFLINE_REFRESH_TOKEN,
  ...(lifetimeSeconds === undefined ? {} : { expires_in: lifetimeSeconds }),
});

const deviceAuthorizationFixture = (paceSeconds: number | undefined): unknown => ({
  device_code: DEVICE_CODE,
  user_code: 'WXYZ-ABCD',
  verification_uri: DEVICE_AUTHORIZATION_ENDPOINT,
  expires_in: DEVICE_CODE_LIFETIME_SECONDS,
  ...(paceSeconds === undefined ? {} : { interval: paceSeconds }),
});

const authorizing: ServerTurn = () => anAnswerFixture(deviceAuthorizationFixture(NO_POLL_DELAY));
const authorizingWithoutNamingAPace: ServerTurn = () => anAnswerFixture(deviceAuthorizationFixture(NO_PACE_NAMED));
const granting: ServerTurn = () => anAnswerFixture(tokensFixture(DEVICE_TOKEN, TOKEN_LIFETIME_SECONDS));
const grantingAgain: ServerTurn = () => anAnswerFixture(tokensFixture(RE_ENROLLED_DEVICE_TOKEN, TOKEN_LIFETIME_SECONDS));
const grantingWithoutNamingALifetime: ServerTurn = () => anAnswerFixture(tokensFixture(DEVICE_TOKEN, NO_LIFETIME_NAMED));
const grantingALifetimeAlreadySpent: ServerTurn = () => anAnswerFixture(tokensFixture(DEVICE_TOKEN, A_LIFETIME_ALREADY_SPENT));
const renewing: ServerTurn = () => anAnswerFixture(tokensFixture(RENEWED_DEVICE_TOKEN, TOKEN_LIFETIME_SECONDS));
const renewingWithoutNamingALifetime: ServerTurn = () => anAnswerFixture(tokensFixture(RENEWED_DEVICE_TOKEN, NO_LIFETIME_NAMED));
const endingTheSession: ServerTurn = () => new HttpResponse({ status: 204 });
const stillPending: ServerTurn = () => aRefusalFixture('authorization_pending');
const askingToSlowDown: ServerTurn = () => aRefusalFixture('slow_down');
const buryingTheRefreshToken: ServerTurn = () => aRefusalFixture('invalid_grant');
const refusalFixture =
  (reason: string): ServerTurn =>
  () =>
    aRefusalFixture(reason);
const outOfReach: ServerTurn = () => aNetworkFailureFixture();

const namingAnotherClient: ServerTurn = () => aRefusalFixture('invalid_client');
const askingForNoOfflineAccess: ServerTurn = () => aRefusalFixture('invalid_scope');
const notTheGrantItIssued: ServerTurn = () => aRefusalFixture('invalid_grant');
const noSuchEndpoint: ServerTurn = () => new HttpErrorResponse({ status: 404, error: null });

interface AuthorizationServerBehaviour {
  authorizations: ServerTurn[];
  claims: ServerTurn[];
  renewals: ServerTurn[];
  logouts: ServerTurn[];
}

const AS_USUAL: AuthorizationServerBehaviour = {
  authorizations: [authorizing],
  claims: [granting],
  renewals: [renewing],
  logouts: [endingTheSession],
};

const NOTHING_UNUSUAL: Partial<AuthorizationServerBehaviour> = {};

const scriptOf = (turns: ServerTurn[]): ServerTurn => {
  let taken = 0;

  return () => {
    const turn = turns[Math.min(taken, turns.length - 1)];
    taken += 1;
    return turn();
  };
};

class AuthorizationServerFixture implements HttpBackend {
  claimsMade = 0;
  renewalsMade = 0;
  sessionsEnded = 0;

  private readonly nextAuthorization: ServerTurn;
  private readonly nextClaim: ServerTurn;
  private readonly nextRenewal: ServerTurn;
  private readonly nextLogout: ServerTurn;

  private holdingTokenAnswers = false;
  private releaseTheHeldAnswer: () => void = () => undefined;
  private readonly heldAnswer: Promise<void>;

  constructor(behaviour: AuthorizationServerBehaviour) {
    this.nextAuthorization = scriptOf(behaviour.authorizations);
    this.nextClaim = scriptOf(behaviour.claims);
    this.nextRenewal = scriptOf(behaviour.renewals);
    this.nextLogout = scriptOf(behaviour.logouts);
    this.heldAnswer = new Promise<void>(resolve => {
      this.releaseTheHeldAnswer = resolve;
    });
  }

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  holdsItsTokenAnswers(): void {
    this.holdingTokenAnswers = true;
  }

  answersWhatItHeld(): void {
    this.releaseTheHeldAnswer();
  }

  private async answer(request: HttpRequest<unknown>): Promise<ServerAnswer> {
    const turn = this.turnFor(request.url, new URLSearchParams(request.serializeBody() as string));

    if (this.holdingTokenAnswers && request.url === TOKEN_ENDPOINT) {
      await this.heldAnswer;
    }

    return onceTheRequestHasTravelled(turn());
  }

  private turnFor(url: string, form: URLSearchParams): ServerTurn {
    if (form.get('client_id') !== DEVICE_CLIENT_ID) {
      return namingAnotherClient;
    }
    if (url === DEVICE_AUTHORIZATION_ENDPOINT) {
      return this.turnForAnAuthorization(form);
    }
    if (url === TOKEN_ENDPOINT) {
      return this.turnForATokenRequest(form);
    }
    if (url === LOGOUT_ENDPOINT) {
      return this.turnForALogout(form);
    }
    return noSuchEndpoint;
  }

  private turnForAnAuthorization(form: URLSearchParams): ServerTurn {
    if (!(form.get('scope') ?? '').includes('offline_access')) {
      return askingForNoOfflineAccess;
    }
    return this.nextAuthorization;
  }

  private turnForATokenRequest(form: URLSearchParams): ServerTurn {
    if (form.get('grant_type') === REFRESH_TOKEN_GRANT) {
      return this.turnForARenewal(form);
    }
    return this.turnForAClaim(form);
  }

  private turnForAClaim(form: URLSearchParams): ServerTurn {
    this.claimsMade += 1;

    if (form.get('grant_type') !== DEVICE_CODE_GRANT || form.get('device_code') !== DEVICE_CODE) {
      return notTheGrantItIssued;
    }
    return this.nextClaim;
  }

  private turnForARenewal(form: URLSearchParams): ServerTurn {
    this.renewalsMade += 1;

    if (form.get('refresh_token') !== OFFLINE_REFRESH_TOKEN) {
      return notTheGrantItIssued;
    }
    return this.nextRenewal;
  }

  private turnForALogout(form: URLSearchParams): ServerTurn {
    if (form.get('refresh_token') !== OFFLINE_REFRESH_TOKEN) {
      return notTheGrantItIssued;
    }
    return () => this.endTheSession();
  }

  private endTheSession(): ServerAnswer {
    const answer = this.nextLogout();

    if (!(answer instanceof HttpErrorResponse)) {
      this.sessionsEnded += 1;
    }
    return answer;
  }
}

const anAuthorizationServerFixture = (behaviour: Partial<AuthorizationServerBehaviour> = NOTHING_UNUSUAL): AuthorizationServerFixture =>
  new AuthorizationServerFixture({ ...AS_USUAL, ...behaviour });

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
    thenItHasNoToken();
  });

  it('should hand over the token of the open session', async () => {
    await whenOpeningTheSession();

    thenItHandsOver(sessionToken);
  });

  it('should hand over nothing again once the session is ended', async () => {
    await givenAnOpenSession();

    whenEndingTheSession();

    thenItHasNoToken();
  });

  const givenAnOpenSession = (): Promise<void> => authentication.authenticate();
  const whenOpeningTheSession = (): Promise<void> => authentication.authenticate();
  const whenEndingTheSession = (): void => authentication.logout();
  const thenItHandsOver = (token: string): void => expect(authentication.currentToken()).toEqual(token);
  const thenItHasNoToken = (): void => expect(authentication.currentToken()).toBeUndefined();
});

describe('Authentication without a device company', () => {
  it('should expose no company before device enrolment', async () => {
    const authentication = givenInMemoryAuthentication();

    await whenSynchronizingTheSession(authentication);

    thenItHasNoDeviceCompany(authentication);
  });

  it('should need no disk synchronization when no persistent storage is configured', async () => {
    const device = givenDeviceAuthenticationWithoutPersistentStorage();

    await whenSynchronizingTheSession(device);

    thenItHasNoDeviceCompany(device);
  });

  const givenInMemoryAuthentication = (): AuthenticationPort => new InMemoryAuthentication();
  const givenDeviceAuthenticationWithoutPersistentStorage = (): AuthenticationPort =>
    Injector.create({
      providers: [DeviceAuthentication, { provide: HttpBackend, useValue: {} }, { provide: DeviceGrantConfiguration, useValue: {} }],
    }).get(DeviceAuthentication);
  const whenSynchronizingTheSession = (authentication: AuthenticationPort): Promise<void> => authentication.synchronizeSession();
  const thenItHasNoDeviceCompany = (authentication: AuthenticationPort): void => {
    expect(authentication.currentTenant()).toBeUndefined();
  };
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
    const authentication = givenKeycloakOpensNoSession();

    await whenAuthenticating(authentication);

    thenNoTokenIsAvailable(authentication);
    thenTheWindowReloads();
  });

  it('should hand over the renewed token once the session has refreshed', async () => {
    const authentication = givenKeycloakRenewsTheSession();

    await whenAuthenticating(authentication);

    thenTokenIs(authentication, RENEWED_KEYCLOAK_TOKEN);
  });

  it('should keep handing over the token it had when the refresh fails', async () => {
    const authentication = givenKeycloakCannotRefreshTheSession();

    await whenAuthenticating(authentication);

    thenTokenIs(authentication, KEYCLOAK_TOKEN);
  });

  const givenKeycloakOpensNoSession = (): AuthenticationPort =>
    buildKeycloakAuthentication(keycloakSessionFixture({ opensSession: false }));
  const givenKeycloakRenewsTheSession = (): AuthenticationPort =>
    buildKeycloakAuthentication(keycloakSessionFixture({ refresh: 'renews' }));
  const givenKeycloakCannotRefreshTheSession = (): AuthenticationPort =>
    buildKeycloakAuthentication(keycloakSessionFixture({ refresh: 'fails' }));
  const whenAuthenticating = (authentication: AuthenticationPort): Promise<void> => authentication.authenticate();
  const thenNoTokenIsAvailable = (authentication: AuthenticationPort): void => expect(authentication.currentToken()).toBeUndefined();
  const thenTheWindowReloads = (): void => expect(window.location.reload).toHaveBeenCalled();
  const thenTokenIs = (authentication: AuthenticationPort, token: string): void => expect(authentication.currentToken()).toEqual(token);
});

describe('Device Authentication, beyond the contract', () => {
  const A_TICK = 1000;
  const A_SLOWER_PACE = 6 * 1000;
  const A_MINUTE_AND_A_HALF = 90 * 1000;
  const A_SHIFT = 10 * 60 * 1000;
  const A_MOMENT_THE_TOKEN_OUTLIVES_ITS_RENEWAL = 280 * 1000;
  const ONE_CLAIM = 1;
  const ONE_RENEWAL = 1;
  const A_SANE_NUMBER_OF_RENEWALS = 10;
  const NO_SESSION_ENDED = 0;
  const ONE_SESSION_ENDED = 1;

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

  const whenAMinuteAndAHalfPasses = (): Promise<void> => vi.advanceTimersByTimeAsync(A_MINUTE_AND_A_HALF).then(() => undefined);

  const whenTheRenewalHasFailedButTheTokenLives = (): Promise<void> =>
    vi.advanceTimersByTimeAsync(A_MOMENT_THE_TOKEN_OUTLIVES_ITS_RENEWAL).then(() => undefined);

  const whenTheRequestHasLeft = (): Promise<void> => vi.advanceTimersByTimeAsync(A_TICK).then(() => undefined);

  const whenTheSlowerPaceHasPassed = (): Promise<void> => vi.advanceTimersByTimeAsync(A_SLOWER_PACE).then(() => undefined);

  const whenEnrolmentHasBegun = (authentication: AuthenticationPort): Promise<void> => {
    void authentication.authenticate();

    return whenTheRequestHasLeft();
  };

  const whenTheHeldAnswerArrives = (server: AuthorizationServerFixture): Promise<void> => {
    server.answersWhatItHeld();

    return whenTheRequestHasLeft();
  };

  const givenAuthentication = (behaviour: Partial<AuthorizationServerBehaviour> = NOTHING_UNUSUAL): AuthenticationPort =>
    buildDeviceAuthentication(anAuthorizationServerFixture(behaviour));

  const givenAuthorizationServer = (behaviour: Partial<AuthorizationServerBehaviour> = NOTHING_UNUSUAL): AuthorizationServerFixture =>
    anAuthorizationServerFixture(behaviour);

  const givenAuthenticationBackedBy = (server: AuthorizationServerFixture): AuthenticationPort => buildDeviceAuthentication(server);

  const givenTheServerHoldsTokenAnswers = (server: AuthorizationServerFixture): void => server.holdsItsTokenAnswers();

  const whenEndingTheSession = (authentication: AuthenticationPort): void => authentication.logout();

  const thenTokenIs = (authentication: AuthenticationPort, token: string): void => expect(authentication.currentToken()).toEqual(token);

  const thenNoTokenIsAvailable = (authentication: AuthenticationPort): void => expect(authentication.currentToken()).toBeUndefined();

  const thenClaimsMadeAre = (server: AuthorizationServerFixture, count: number): void => expect(server.claimsMade).toEqual(count);

  const thenRenewalsMadeAre = (server: AuthorizationServerFixture, count: number): void => expect(server.renewalsMade).toEqual(count);

  const thenRenewalsStayBelow = (server: AuthorizationServerFixture, count: number): void =>
    expect(server.renewalsMade).toBeLessThan(count);

  const thenSessionsEndedAre = (server: AuthorizationServerFixture, count: number): void => expect(server.sessionsEnded).toEqual(count);

  it('should keep asking for as long as nobody has typed the code', async () => {
    const authentication = givenAuthentication({ claims: [stillPending, stillPending, granting] });

    await whenEnrolling(authentication);

    thenTokenIs(authentication, DEVICE_TOKEN);
  });

  it('should still enrol once it has been asked to slow down', async () => {
    const authentication = givenAuthentication({ claims: [askingToSlowDown, granting] });

    await whenEnrollingAtTheSlowerPace(authentication);

    thenTokenIs(authentication, DEVICE_TOKEN);
  });

  it('should hold its first claim back to the pace RFC 8628 sets when the server names none', async () => {
    const authentication = givenAuthentication({ authorizations: [authorizingWithoutNamingAPace] });

    await whenEnrolmentHasBegun(authentication);

    thenNoTokenIsAvailable(authentication);

    await whenTheSlowerPaceHasPassed();

    thenTokenIs(authentication, DEVICE_TOKEN);
  });

  it.each(['access_denied', 'expired_token'])('should hand over nothing when the enrolment is refused with %s', async refusal => {
    const authentication = givenAuthentication({ claims: [refusalFixture(refusal)] });

    await whenEnrolling(authentication);

    thenNoTokenIsAvailable(authentication);
  });

  it.each(['toString', 'constructor'])('should stop claiming when the enrolment is refused with %s', async refusal => {
    const server = givenAuthorizationServer({ claims: [refusalFixture(refusal)] });
    const authentication = givenAuthenticationBackedBy(server);

    await whenEnrolmentHasBegun(authentication);
    await whenTheShiftGoesOn();

    thenClaimsMadeAre(server, ONE_CLAIM);
    thenNoTokenIsAvailable(authentication);
  });

  it('should hand over nothing when the refusal carries no reason to read', async () => {
    const authentication = givenAuthentication({ claims: [outOfReach] });

    await whenEnrolling(authentication);

    thenNoTokenIsAvailable(authentication);
  });

  it('should hand over nothing when the authorization server cannot be reached', async () => {
    const authentication = givenAuthentication({ authorizations: [outOfReach] });

    await whenEnrolling(authentication);

    thenNoTokenIsAvailable(authentication);
  });

  it('should stop claiming once the enrolment is abandoned', async () => {
    const server = givenAuthorizationServer({ authorizations: [authorizingWithoutNamingAPace], claims: [stillPending] });
    const authentication = givenAuthenticationBackedBy(server);

    await whenEnrolmentHasBegun(authentication);
    await whenTheSlowerPaceHasPassed();

    whenEndingTheSession(authentication);
    await whenTheShiftGoesOn();

    thenClaimsMadeAre(server, ONE_CLAIM);
  });

  it('should hand over a renewed token before the enrolled one expires', async () => {
    const authentication = givenAuthentication();

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    thenTokenIs(authentication, RENEWED_DEVICE_TOKEN);
  });

  it('should keep handing over the token it had while the renewal is refused and the token still lives', async () => {
    const authentication = givenAuthentication({ renewals: [outOfReach] });

    await givenAnEnrolledPupitre(authentication);
    await whenTheRenewalHasFailedButTheTokenLives();

    thenTokenIs(authentication, DEVICE_TOKEN);
  });

  it('should hand over nothing once the token has died and the authorization server stays out of reach', async () => {
    const authentication = givenAuthentication({ renewals: [outOfReach] });

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    thenNoTokenIsAvailable(authentication);
  });

  it('should hand over a renewed token once the network is back', async () => {
    const authentication = givenAuthentication({ renewals: [outOfReach, renewing] });

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    thenTokenIs(authentication, RENEWED_DEVICE_TOKEN);
  });

  it('should enrol again once the authorization server has buried its refresh token', async () => {
    const authentication = givenAuthentication({ claims: [granting, grantingAgain], renewals: [buryingTheRefreshToken] });

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    thenTokenIs(authentication, RE_ENROLLED_DEVICE_TOKEN);
  });

  it('should stop asking to renew a refresh token the authorization server has buried', async () => {
    const server = givenAuthorizationServer({ authorizations: [authorizing, outOfReach], renewals: [buryingTheRefreshToken] });
    const authentication = givenAuthenticationBackedBy(server);

    await givenAnEnrolledPupitre(authentication);
    await whenTheShiftGoesOn();

    thenRenewalsMadeAre(server, ONE_RENEWAL);
  });

  it('should hand over the token it was granted when the server names a lifetime already spent', async () => {
    const authentication = givenAuthentication({ claims: [grantingALifetimeAlreadySpent] });

    await whenEnrolling(authentication);

    thenTokenIs(authentication, DEVICE_TOKEN);
  });

  it('should not hammer the authorization server when it names no token lifetime', async () => {
    const server = givenAuthorizationServer({
      claims: [grantingWithoutNamingALifetime],
      renewals: [renewingWithoutNamingALifetime],
    });
    const authentication = givenAuthenticationBackedBy(server);

    await givenAnEnrolledPupitre(authentication);
    await whenAMinuteAndAHalfPasses();

    thenRenewalsStayBelow(server, A_SANE_NUMBER_OF_RENEWALS);
    thenTokenIs(authentication, RENEWED_DEVICE_TOKEN);
  });

  it('should tell the authorization server to end the session it opened', async () => {
    const server = givenAuthorizationServer();
    const authentication = givenAuthenticationBackedBy(server);

    await givenAnEnrolledPupitre(authentication);

    whenEndingTheSession(authentication);
    await whenTheRequestHasLeft();

    thenSessionsEndedAre(server, ONE_SESSION_ENDED);
  });

  it('should tell the authorization server nothing when no session was ever opened', async () => {
    const server = givenAuthorizationServer();
    const authentication = givenAuthenticationBackedBy(server);

    whenEndingTheSession(authentication);
    await whenTheRequestHasLeft();

    thenSessionsEndedAre(server, NO_SESSION_ENDED);
  });

  it('should end the session locally even when the authorization server cannot be told', async () => {
    const authentication = givenAuthentication({ logouts: [outOfReach] });

    await givenAnEnrolledPupitre(authentication);

    whenEndingTheSession(authentication);
    await whenTheRequestHasLeft();

    thenNoTokenIsAvailable(authentication);
  });

  it('should hand over nothing once the session is ended, even with a renewal already in flight', async () => {
    const server = givenAuthorizationServer();
    const authentication = givenAuthenticationBackedBy(server);

    await givenAnEnrolledPupitre(authentication);
    givenTheServerHoldsTokenAnswers(server);
    await whenTheShiftGoesOn();

    whenEndingTheSession(authentication);
    await whenTheHeldAnswerArrives(server);

    thenNoTokenIsAvailable(authentication);
  });

  it('should hand over nothing once the enrolment is abandoned, even with a claim already in flight', async () => {
    const server = givenAuthorizationServer();
    const authentication = givenAuthenticationBackedBy(server);

    givenTheServerHoldsTokenAnswers(server);
    await whenEnrolmentHasBegun(authentication);

    whenEndingTheSession(authentication);
    await whenTheHeldAnswerArrives(server);

    thenNoTokenIsAvailable(authentication);
  });
});
