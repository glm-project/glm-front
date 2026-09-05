import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { DeviceAuthentication } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceAuthentication';
import { DeviceGrantConfiguration } from '@/pupitre/shared/authentication/infrastructure/secondary/device/DeviceGrantConfiguration';
import { StockageLocalPort } from '@/pupitre/shared/stockage-local/domain/StockageLocalPort';
import { IndexedDbStockageLocal } from '@/pupitre/shared/stockage-local/infrastructure/secondary/IndexedDbStockageLocal';
import { Provider } from '@angular/core';

import { environment } from './environments/environment';

export const authProvider: Provider[] = [
  { provide: StockageLocalPort, useClass: IndexedDbStockageLocal },
  {
    provide: DeviceGrantConfiguration,
    useFactory: () => new DeviceGrantConfiguration(environment.keycloak.url, environment.keycloak.realm, environment.keycloak.client_id),
  },
  { provide: AuthenticationPort, useClass: DeviceAuthentication },
];
