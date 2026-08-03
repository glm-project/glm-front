import { Provider } from '@angular/core';
import Keycloak from 'keycloak-js';

import { environment } from '../../environments/environment';

export const keycloakProvider: Provider = {
  provide: Keycloak,
  useFactory: () =>
    new Keycloak({
      url: environment.keycloak.url,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.client_id,
    }),
};
