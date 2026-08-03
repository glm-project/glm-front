import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { httpAuthInterceptor } from './app/auth/http-auth.interceptor';
import { keycloakProvider } from './app/auth/keycloak.provider';

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
    keycloakProvider,
  ],
}).catch((err: unknown) => console.error(err));
