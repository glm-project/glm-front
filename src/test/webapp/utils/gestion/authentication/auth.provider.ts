import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { ROLE_GESTIONNAIRE } from '@/gestion/shared/authentication/infrastructure/primary/gestionnaire';
import { InMemoryGestionAuthentication } from '@/gestion/shared/authentication/infrastructure/secondary/in-memory/InMemoryGestionAuthentication';
import { Provider } from '@angular/core';
import './AuthenticationFixture';
import './RolesFixture';

export const authProvider: Provider[] = [
  {
    provide: InMemoryGestionAuthentication,
    useFactory: () =>
      new InMemoryGestionAuthentication(
        window.gestionRolesFixture ?? [ROLE_GESTIONNAIRE],
        window.gestionAuthenticationFixture ?? new InMemoryAuthentication(),
      ),
  },
  { provide: AuthenticationPort, useExisting: InMemoryGestionAuthentication },
  { provide: RolesPort, useExisting: InMemoryGestionAuthentication },
];
