import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { DeviceAuthentication } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceAuthentication';
import { DeviceGrantConfiguration } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceGrantConfiguration';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { IndexedDbLocalStorage } from '@/pupitre/shared/local-storage/infrastructure/secondary/IndexedDbLocalStorage';
import { Provider } from '@angular/core';

import { environment } from './environments/environment';

export const authProvider: Provider[] = [
  { provide: LocalStoragePort, useClass: IndexedDbLocalStorage },
  {
    provide: DeviceGrantConfiguration,
    useFactory: () => new DeviceGrantConfiguration(environment.keycloak.url, environment.keycloak.realm, environment.keycloak.client_id),
  },
  { provide: AuthenticationPort, useClass: DeviceAuthentication },
];
