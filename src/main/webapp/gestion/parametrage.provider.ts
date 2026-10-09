import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { LogoAffiche } from './contexts/parametrage/application/LogoAffiche';
import { IconeDeLOnglet } from './contexts/parametrage/domain/IconeDeLOnglet';
import { ParametragePort } from './contexts/parametrage/domain/ParametragePort';
import { HttpParametrage } from './contexts/parametrage/infrastructure/secondary/HttpParametrage';
import { IconeDeLOngletDuDocument } from './contexts/parametrage/infrastructure/secondary/IconeDeLOngletDuDocument';

export const parametrageProvider: Provider[] = [
  ApiClient,
  { provide: ParametragePort, useClass: HttpParametrage },
  { provide: IconeDeLOnglet, useClass: IconeDeLOngletDuDocument },
  LogoAffiche,
];
