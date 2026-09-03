import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// No authentication provider: the device-grant client this front needs does not exist in the realm yet.
bootstrapApplication(App, {
  providers: [provideRouter(routes)],
}).catch((err: unknown) => console.error(err));
