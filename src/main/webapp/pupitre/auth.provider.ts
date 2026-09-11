import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { DeviceEnrolmentPort } from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { DeviceAuthentication } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceAuthentication';
import { DeviceGrantClient } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceGrantClient';
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
  DeviceGrantClient,
  DeviceAuthentication,
  { provide: AuthenticationPort, useExisting: DeviceAuthentication },
  { provide: DeviceSessionPort, useExisting: DeviceAuthentication },
  { provide: DeviceEnrolmentPort, useExisting: DeviceAuthentication },
  { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
];
