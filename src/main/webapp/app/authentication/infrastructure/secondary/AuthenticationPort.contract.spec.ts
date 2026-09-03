import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { Injector } from '@angular/core';
import Keycloak from 'keycloak-js';
import { MockInstance } from 'vitest';
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

const buildInMemoryAuthentication = (): AuthenticationPort =>
  Injector.create({ providers: [InMemoryAuthentication] }).get(InMemoryAuthentication);

const buildKeycloakAuthentication = (keycloak: Keycloak): AuthenticationPort =>
  Injector.create({ providers: [{ provide: Keycloak, useValue: keycloak }, KeycloakOidcAuthentication] }).get(KeycloakOidcAuthentication);

const adapters: [string, () => AuthenticationPort, string][] = [
  ['in-memory', buildInMemoryAuthentication, IN_MEMORY_TOKEN],
  ['keycloak-oidc', () => buildKeycloakAuthentication(keycloakSessionFixture()), KEYCLOAK_TOKEN],
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
