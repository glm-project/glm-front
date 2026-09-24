import { httpAuthInterceptor } from '@/app/shared/authentication/infrastructure/primary/http-auth.interceptor';
import { provideErrorHandler } from '@/app/shared/error-handler/infrastructure/primary/error-handler.provider';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { httpSessionRefreshInterceptor } from '@/gestion/shared/authentication/infrastructure/primary/http-session-refresh.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.route';
import { App } from './app/app';
import { authProvider } from './auth.provider';
import { supervisionDemonstrationProvider } from './supervision.provider';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptors([httpSessionRefreshInterceptor, httpAuthInterceptor])),
    provideRouter(routes),
    provideErrorHandler(ConsoleErrorHandler),
    authProvider,
    supervisionDemonstrationProvider,
  ],
}).catch((err: unknown) => {
  console.error(err);
});
