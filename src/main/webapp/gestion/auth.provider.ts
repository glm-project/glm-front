import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { KeycloakOidcAuthentication } from '@/app/shared/authentication/infrastructure/secondary/keycloak-oidc/KeycloakOidcAuthentication';
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
];
