import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { AnomaliesReadPort } from './contexts/anomalies-de-pointage/domain/dossier/AnomaliesReadPort';
import { RegularisationPort } from './contexts/anomalies-de-pointage/domain/regularisation/RegularisationPort';
import { HttpAnomalies } from './contexts/anomalies-de-pointage/infrastructure/secondary/HttpAnomalies';
import { HttpRegularisation } from './contexts/anomalies-de-pointage/infrastructure/secondary/HttpRegularisation';

export const anomaliesDePointageProvider: Provider[] = [
  ApiClient,
  HttpAnomalies,
  { provide: AnomaliesReadPort, useExisting: HttpAnomalies },
  HttpRegularisation,
  { provide: RegularisationPort, useExisting: HttpRegularisation },
];
