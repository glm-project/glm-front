import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// No HTTP client and no authentication provider yet: the pupitre calls nothing, and its bearer token
// comes from a device-grant adapter that does not exist. Both arrive with the governed auth context.
bootstrapApplication(App, {
  providers: [provideRouter(routes)],
}).catch((err: unknown) => console.error(err));
