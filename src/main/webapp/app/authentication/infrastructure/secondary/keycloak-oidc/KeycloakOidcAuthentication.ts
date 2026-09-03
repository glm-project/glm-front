import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { inject, Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

const MIN_TOKEN_VALIDITY_SECONDS = 70;

@Injectable()
export class KeycloakOidcAuthentication extends AuthenticationPort {
  private readonly keycloak: Keycloak = inject(Keycloak);

  override async authenticate(): Promise<void> {
    const authenticated = await this.keycloak.init({ onLoad: 'login-required', checkLoginIframe: false });

    if (!authenticated) {
      globalThis.location.reload();
      return;
    }

    await this.refreshToken();
  }

  override currentToken(): string | undefined {
    return this.keycloak.token;
  }

  override logout(): void {
    this.keycloak.logout();
  }

  private refreshToken(): Promise<unknown> {
    return this.keycloak.updateToken(MIN_TOKEN_VALIDITY_SECONDS).catch((e: unknown) => console.error('Failed to refresh token', e));
  }
}
