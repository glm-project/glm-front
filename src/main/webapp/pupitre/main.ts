import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { App } from './app';
import { routes } from './app.route';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerWhenStable:30000' }),
  ],
}).catch((err: unknown) => console.error(err));
