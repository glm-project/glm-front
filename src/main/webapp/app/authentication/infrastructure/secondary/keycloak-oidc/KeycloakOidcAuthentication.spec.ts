import { Injector } from '@angular/core';
import Keycloak, { KeycloakInitOptions } from 'keycloak-js';
import { Mock } from 'vitest';
import { KeycloakOidcAuthentication } from './KeycloakOidcAuthentication';

const TOKEN = '1a2b3c';
const EXPECTED_INIT_PARAMS: KeycloakInitOptions = { onLoad: 'login-required', checkLoginIframe: false };

describe('Keycloak OIDC Authentication', () => {
  let authentication: KeycloakOidcAuthentication;
  let keycloakFixture: Keycloak;

  let consoleDebugMock: Mock;
  let consoleErrorMock: Mock;

  beforeEach(() => {
    keycloakFixture = {
      init: vi.fn().mockReturnValue(Promise.resolve(true) as unknown as Promise<boolean>),
      updateToken: vi.fn().mockReturnValue(Promise.resolve(true) as unknown as Promise<boolean>),
      logout: vi.fn().mockReturnValue(Promise.resolve(null) as unknown as Promise<void>),
      idToken: 'idTokenValue',
      token: 'tokenValue',
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
  });

  afterEach(() => {
    consoleDebugMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  describe('authenticate', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: {
          reload: vi.fn(),
        },
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
      });
    });

    it('should open the session when the user is authenticated', async () => {
      vi.spyOn(keycloakFixture, 'init').mockReturnValue(Promise.resolve(true).then() as unknown as Promise<boolean>);

      await authentication.authenticate();

      expect(keycloakFixture.init).toHaveBeenCalledWith(EXPECTED_INIT_PARAMS);
      expect(window.location.reload).not.toHaveBeenCalled();
      expect(console.debug).toHaveBeenCalledWith('Authenticated');
    });

    it('should reload the window when the user is not authenticated', async () => {
      vi.spyOn(keycloakFixture, 'init').mockReturnValue(Promise.resolve(false).then() as unknown as Promise<boolean>);

      await authentication.authenticate();

      expect(keycloakFixture.init).toHaveBeenCalledWith(EXPECTED_INIT_PARAMS);
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Update token', () => {
    it('should log the remaining validity when the token is still valid', async () => {
      keycloakFixture.tokenParsed = {
        exp: 1651319001, // 2022-04-30 13:43:21
      };
      keycloakFixture.timeSkew = 3;
      vi.spyOn(Date, 'now').mockReturnValue(1651318847714); // 2022-04-30 13:40:47

      const updateTokenPromise = Promise.resolve(false);
      vi.spyOn(keycloakFixture, 'updateToken').mockReturnValue(updateTokenPromise as unknown as Promise<boolean>);

      await authentication.authenticate();
      await updateTokenPromise;

      expect(keycloakFixture.updateToken).toHaveBeenCalledWith(70);
      expect(console.debug).toHaveBeenCalledWith('Token not refreshed, valid for 156 seconds');
    });

    it('should log the refresh when the token is renewed', async () => {
      const updateTokenPromise = Promise.resolve(true);
      vi.spyOn(keycloakFixture, 'updateToken').mockReturnValue(updateTokenPromise as unknown as Promise<boolean>);

      await authentication.authenticate();
      await updateTokenPromise;

      expect(keycloakFixture.updateToken).toHaveBeenCalledWith(70);
      expect(console.debug).toHaveBeenCalledWith('Token refreshed');
    });

    it('should log an error when the refresh fails', async () => {
      const updateTokenPromise = Promise.reject(new Error('unknown error'));
      vi.spyOn(keycloakFixture, 'updateToken').mockReturnValue(updateTokenPromise as unknown as Promise<boolean>);

      await authentication.authenticate();

      expect(keycloakFixture.updateToken).toHaveBeenCalledWith(70);

      await expect(updateTokenPromise).rejects.toEqual(new Error('unknown error'));
      expect(console.error).toHaveBeenCalledWith('Failed to refresh token', new Error('unknown error'));
    });
  });

  describe('logout', () => {
    it('should end the Keycloak session', () => {
      authentication.logout();

      expect(keycloakFixture.logout).toHaveBeenCalledWith();
    });
  });

  describe('currentToken', () => {
    it('should return the token Keycloak holds', () => {
      Object.defineProperty(keycloakFixture, 'token', {
        value: TOKEN,
      });

      expect(authentication.currentToken()).toEqual(TOKEN);
    });
  });
});
