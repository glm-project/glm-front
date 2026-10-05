import { anomaliesDePointageHttpProvider } from '@/gestion/anomalies-de-pointage-http.provider';
import { AnomaliesRightsPort } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/AnomaliesRightsPort';
import { Provider } from '@angular/core';

declare global {
  interface Window {
    gestionAnomaliesGestionnaire?: boolean;
  }
}

export const anomaliesDePointageProvider: Provider[] = [
  ...anomaliesDePointageHttpProvider,
  { provide: AnomaliesRightsPort, useFactory: () => ({ canApply: () => window.gestionAnomaliesGestionnaire !== false }) },
];
