import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { KeycloakOidcAuthentication } from '@/app/authentication/infrastructure/secondary/keycloak-oidc/KeycloakOidcAuthentication';
import { Provider } from '@angular/core';
import Keycloak from 'keycloak-js';

/*
 * Keycloak stub used only by the `e2e` build configuration (see angular.json `fileReplacements`).
 *
 * The real adapter is configured with `onLoad: 'login-required'`, which redirects the browser to the
 * Keycloak server as soon as the app boots. Cypress cannot stub that away: no network request happens
 * before the redirect, and `window.location.assign` is unforgeable, so the redirect has to be removed
 * at the injection boundary instead. This file is never part of a production build.
 */
const keycloakStub = {
  authenticated: true,
  token: 'e2e-token',
  init: () => Promise.resolve(true),
  updateToken: () => Promise.resolve(false),
  logout: () => Promise.resolve(),
} as unknown as Keycloak;

export const authProvider: Provider[] = [
  { provide: Keycloak, useFactory: () => keycloakStub },
  { provide: AuthenticationPort, useClass: KeycloakOidcAuthentication },
];
