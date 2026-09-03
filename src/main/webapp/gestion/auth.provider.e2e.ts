import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { Provider } from '@angular/core';

/*
 * Bound by the `e2e` build configuration only (see angular.json `fileReplacements`), which is what keeps
 * the in-memory adapter out of the production graph: a runtime flag would ship the bypass with the app.
 *
 * The real adapter boots with `onLoad: 'login-required'` and redirects to Keycloak before any request
 * leaves the browser, so Cypress has nothing to intercept — the substitution has to happen here.
 */
export const authProvider: Provider[] = [{ provide: AuthenticationPort, useClass: InMemoryAuthentication }];
