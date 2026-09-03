import { httpAuthInterceptor } from '@/app/auth/http-auth.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { keycloakProvider } from './keycloak.provider';

import { App } from './app';
import { routes } from './app.route';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [provideHttpClient(withInterceptors([httpAuthInterceptor])), provideRouter(routes), keycloakProvider],
}).catch((err: unknown) => console.error(err));
