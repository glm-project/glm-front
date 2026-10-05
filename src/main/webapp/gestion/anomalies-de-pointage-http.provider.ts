import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { ApplicationActePort, PrevisualisationAnomaliePort } from './contexts/anomalies-de-pointage/domain/acte/AnomaliesActesPorts';
import { AnomaliesReadPort } from './contexts/anomalies-de-pointage/domain/dossier/AnomaliesReadPort';
import { AnomaliesRightsPort } from './contexts/anomalies-de-pointage/domain/dossier/AnomaliesRightsPort';
import { HttpAnomalies } from './contexts/anomalies-de-pointage/infrastructure/secondary/HttpAnomalies';
import { TokenAnomaliesRights } from './contexts/anomalies-de-pointage/infrastructure/secondary/TokenAnomaliesRights';

export const anomaliesDePointageHttpProvider: Provider[] = [
  ApiClient,
  { provide: AnomaliesRightsPort, useClass: TokenAnomaliesRights },
  HttpAnomalies,
  { provide: AnomaliesReadPort, useExisting: HttpAnomalies },
  { provide: PrevisualisationAnomaliePort, useExisting: HttpAnomalies },
  { provide: ApplicationActePort, useExisting: HttpAnomalies },
];
