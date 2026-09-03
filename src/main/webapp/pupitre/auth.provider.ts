import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { DeviceAuthentication } from '@/app/authentication/infrastructure/secondary/device/DeviceAuthentication';
import { DeviceGrantConfiguration } from '@/app/authentication/infrastructure/secondary/device/DeviceGrantConfiguration';
import { Provider } from '@angular/core';

import { environment } from './environments/environment';

export const authProvider: Provider[] = [
  {
    provide: DeviceGrantConfiguration,
    useFactory: () => new DeviceGrantConfiguration(environment.keycloak.url, environment.keycloak.realm, environment.keycloak.client_id),
  },
  { provide: AuthenticationPort, useClass: DeviceAuthentication },
];
