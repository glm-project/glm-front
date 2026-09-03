import { httpAuthInterceptor } from '@/app/authentication/infrastructure/primary/http-auth.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { authProvider } from './auth.provider';

import { App } from './app';
import { routes } from './app.route';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [provideHttpClient(withInterceptors([httpAuthInterceptor])), provideRouter(routes), authProvider],
}).catch((err: unknown) => console.error(err));
