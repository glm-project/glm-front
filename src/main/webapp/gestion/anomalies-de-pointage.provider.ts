import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { AnomaliesReadPort } from './contexts/anomalies-de-pointage/domain/dossier/AnomaliesReadPort';
import { HttpAnomalies } from './contexts/anomalies-de-pointage/infrastructure/secondary/HttpAnomalies';

export const anomaliesDePointageProvider: Provider[] = [
  ApiClient,
  HttpAnomalies,
  { provide: AnomaliesReadPort, useExisting: HttpAnomalies },
];
