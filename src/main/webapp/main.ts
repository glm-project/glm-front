import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import Keycloak from 'keycloak-js';
import { httpAuthInterceptor } from './app/auth/http-auth.interceptor';

import { App } from './app/app';
import { routes } from './app/app.route';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptors([httpAuthInterceptor])),
    provideRouter(routes),
    // seed4j-needle-main-ts-provider
    {
      provide: Keycloak,
      useFactory: () =>
        new Keycloak({
          url: environment.keycloak.url,
          realm: environment.keycloak.realm,
          clientId: environment.keycloak.client_id,
        }),
    },
  ],
}).catch((err: unknown) => console.error(err));
