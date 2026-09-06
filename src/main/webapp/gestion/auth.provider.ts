import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { KeycloakOidcAuthentication } from '@/gestion/shared/authentication/infrastructure/secondary/keycloak-oidc/KeycloakOidcAuthentication';
import { Provider } from '@angular/core';
import Keycloak from 'keycloak-js';

import { environment } from './environments/environment';

export const authProvider: Provider[] = [
  {
    provide: Keycloak,
    useFactory: () =>
      new Keycloak({
        url: environment.keycloak.url,
        realm: environment.keycloak.realm,
        clientId: environment.keycloak.client_id,
      }),
  },
  { provide: AuthenticationPort, useClass: KeycloakOidcAuthentication },
  { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
];
