import { httpAuthInterceptor } from '@/app/shared/authentication/infrastructure/primary/http-auth.interceptor';
import { httpSessionRefreshInterceptor } from '@/gestion/shared/authentication/infrastructure/primary/http-session-refresh.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';
import { authProvider } from './auth.provider';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptors([httpSessionRefreshInterceptor, httpAuthInterceptor])),
    provideRouter(routes),
    authProvider,
  ],
}).catch((err: unknown) => {
  console.error(err);
});
