import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { inject, Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

const MIN_TOKEN_VALIDITY_SECONDS = 70;

@Injectable()
export class KeycloakOidcAuthentication extends AuthenticationPort {
  private readonly keycloak: Keycloak = inject(Keycloak);

  override async authenticate(): Promise<void> {
    const authenticated = await this.keycloak.init({ onLoad: 'login-required', checkLoginIframe: false });

    if (authenticated) {
      console.debug('Authenticated');
    } else {
      globalThis.location.reload();
    }

    this.refreshToken();
  }

  override currentToken(): string | undefined {
    return this.keycloak.token;
  }

  override logout(): void {
    this.keycloak.logout();
  }

  private refreshToken(): void {
    this.keycloak
      .updateToken(MIN_TOKEN_VALIDITY_SECONDS)
      .then(refreshed => {
        if (refreshed) {
          console.debug('Token refreshed');
        } else {
          const exp = this.keycloak.tokenParsed!.exp!;
          const timeSkew = this.keycloak.timeSkew!;
          console.debug(`Token not refreshed, valid for ${Math.round(exp + timeSkew - Date.now() / 1000)} seconds`);
        }
      })
      .catch((e: unknown) => console.error('Failed to refresh token', e));
  }
}
