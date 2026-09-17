import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { Provider } from '@angular/core';
import { SyntheseDesHeuresPort } from './contexts/releve-des-heures/domain/releve/SyntheseDesHeuresPort';
import { HttpSyntheseDesHeures } from './contexts/releve-des-heures/infrastructure/secondary/HttpSyntheseDesHeures';

export const releveDesHeuresProvider: Provider[] = [
  ApiClient,
  { provide: SyntheseDesHeuresPort, useClass: HttpSyntheseDesHeures },
  { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
];
