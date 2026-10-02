import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { EnvironmentProviders, inject, provideEnvironmentInitializer, Provider } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import './AuthenticationFixture';

export const authProvider: (Provider | EnvironmentProviders)[] = [
  { provide: AuthenticationPort, useFactory: () => window.gestionAuthenticationFixture ?? new InMemoryAuthentication() },
  provideEnvironmentInitializer(() => {
    const router = inject(Router);
    window.gestionInitialNavigationFixture = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
  }),
];

declare global {
  interface Window {
    gestionInitialNavigationFixture?: Promise<NavigationEnd>;
  }
}
