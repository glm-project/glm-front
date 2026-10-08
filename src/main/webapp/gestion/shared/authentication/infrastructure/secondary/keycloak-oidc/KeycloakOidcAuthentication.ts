import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { AwaitedRealmRoles } from '@/gestion/shared/authentication/domain/AwaitedRealmRoles';
import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { inject, Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

const MIN_TOKEN_VALIDITY_SECONDS = 70;

@Injectable()
export class KeycloakOidcAuthentication extends AuthenticationPort implements RolesPort {
  private readonly awaitedRoles = new AwaitedRealmRoles();
  private readonly keycloak: Keycloak = inject(Keycloak);
  private readonly errorHandler = inject(ErrorHandlerPort);

  override async authenticate(): Promise<void> {
    const authenticated = await this.keycloak.init({ onLoad: 'login-required', checkLoginIframe: false });

    if (!authenticated) {
      globalThis.location.reload();
      return;
    }

    await this.refreshToken();
    this.awaitedRoles.grant(this.keycloak.realmAccess?.roles ?? []);
  }

  realmRoles(): Promise<readonly string[]> {
    return this.awaitedRoles.promise;
  }

  override async synchronizeSession(): Promise<void> {
    await this.keycloak.updateToken(MIN_TOKEN_VALIDITY_SECONDS);
  }

  override currentToken(): string | undefined {
    return this.keycloak.token;
  }

  override logout(): void {
    this.keycloak.logout().catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }

  private refreshToken(): Promise<unknown> {
    return this.keycloak.updateToken(MIN_TOKEN_VALIDITY_SECONDS).catch((e: unknown) => {
      this.errorHandler.handleError(e);
    });
  }
}
