import { provideErrorHandler } from '@/app/shared/error-handler/infrastructure/primary/error-handler.provider';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.route';
import { App } from './app/app';
import { authProvider } from './auth.provider';
import { gestionHttpProvider } from './http.provider';
import { parametrageProvider } from './parametrage.provider';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [gestionHttpProvider, provideRouter(routes), provideErrorHandler(ConsoleErrorHandler), authProvider, parametrageProvider],
}).catch((err: unknown) => {
  console.error(err);
});
