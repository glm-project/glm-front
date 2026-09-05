import { httpAuthInterceptor } from '@/app/shared/authentication/infrastructure/primary/http-auth.interceptor';
import { httpDeviceAuthorizationInterceptor } from '@/pupitre/shared/authentication/infrastructure/primary/http-device-authorization.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { App } from './app';
import { routes } from './app.route';
import { authProvider } from './auth.provider';
import { offlineProvider } from './offline.provider';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withInterceptors([httpAuthInterceptor, httpDeviceAuthorizationInterceptor])),
    provideRouter(routes),
    authProvider,
    offlineProvider,
    provideServiceWorker('ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerWhenStable:30000' }),
  ],
}).catch((err: unknown) => console.error(err));
