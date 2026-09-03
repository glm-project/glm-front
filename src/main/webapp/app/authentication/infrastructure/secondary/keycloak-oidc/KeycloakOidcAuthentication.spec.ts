import { Injector } from '@angular/core';
import Keycloak, { KeycloakInitOptions } from 'keycloak-js';
import { Mock } from 'vitest';
import { KeycloakOidcAuthentication } from './KeycloakOidcAuthentication';

const CURRENT_TOKEN = '1a2b3c';
const RENEWED_TOKEN = '4d5e6f';
const EXPECTED_INIT_PARAMS: KeycloakInitOptions = { onLoad: 'login-required', checkLoginIframe: false };
const EXPECTED_MIN_TOKEN_VALIDITY_SECONDS = 70;

describe('Keycloak OIDC Authentication', () => {
  let authentication: KeycloakOidcAuthentication;
  let keycloakFixture: Keycloak;

  let consoleDebugMock: Mock;
  let consoleErrorMock: Mock;

  const originalLocation = window.location;

  beforeEach(() => {
    keycloakFixture = {
      init: vi.fn().mockResolvedValue(true),
      updateToken: vi.fn().mockResolvedValue(false),
      logout: vi.fn().mockResolvedValue(undefined),
      token: CURRENT_TOKEN,
      tokenParsed: {
        exp: 1200,
      },
      timeSkew: 0,
    } as unknown as Keycloak;

    authentication = Injector.create({
      providers: [
        {
          provide: Keycloak,
          useValue: keycloakFixture,
        },
        KeycloakOidcAuthentication,
      ],
    }).get(KeycloakOidcAuthentication);

    consoleDebugMock = vi.spyOn(console, 'debug').mockImplementation(vi.fn());
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(vi.fn());

    Object.defineProperty(window, 'location', {
      value: {
        reload: vi.fn(),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    consoleDebugMock.mockRestore();
    consoleErrorMock.mockRestore();

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });

  it('should hand over the token Keycloak holds once the session is open', async () => {
    await authentication.authenticate();
    await theSilentRefreshHasSettled();

    expect(keycloakFixture.init).toHaveBeenCalledWith(EXPECTED_INIT_PARAMS);
    expect(authentication.currentToken()).toEqual(CURRENT_TOKEN);
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('should reload the window when Keycloak opens no session', async () => {
    keycloakFixture.init = vi.fn().mockResolvedValue(false);

    await authentication.authenticate();
    await theSilentRefreshHasSettled();

    expect(keycloakFixture.init).toHaveBeenCalledWith(EXPECTED_INIT_PARAMS);
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should hand over the renewed token once the silent refresh has run', async () => {
    keycloakFixture.updateToken = vi.fn().mockImplementation(() => {
      keycloakFixture.token = RENEWED_TOKEN;
      return Promise.resolve(true);
    });

    await authentication.authenticate();
    await theSilentRefreshHasSettled();

    expect(keycloakFixture.updateToken).toHaveBeenCalledWith(EXPECTED_MIN_TOKEN_VALIDITY_SECONDS);
    expect(authentication.currentToken()).toEqual(RENEWED_TOKEN);
  });

  it('should keep handing over the current token while it is still valid', async () => {
    await authentication.authenticate();
    await theSilentRefreshHasSettled();

    expect(keycloakFixture.updateToken).toHaveBeenCalledWith(EXPECTED_MIN_TOKEN_VALIDITY_SECONDS);
    expect(authentication.currentToken()).toEqual(CURRENT_TOKEN);
  });

  it('should keep the session going and surface the failure when the refresh fails', async () => {
    keycloakFixture.updateToken = vi.fn().mockRejectedValue(new Error('unknown error'));

    await expect(authentication.authenticate()).resolves.toBeUndefined();
    await theSilentRefreshHasSettled();

    expect(authentication.currentToken()).toEqual(CURRENT_TOKEN);
    expect(console.error).toHaveBeenCalled();
  });

  it('should end the Keycloak session on logout', () => {
    authentication.logout();

    expect(keycloakFixture.logout).toHaveBeenCalledWith();
  });

  const theSilentRefreshHasSettled = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
});
