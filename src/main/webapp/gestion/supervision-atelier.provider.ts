import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { DonneesDeSupervisionPort } from './contexts/supervision-atelier/domain/supervision/DonneesDeSupervisionPort';
import { HttpDonneesDeSupervision } from './contexts/supervision-atelier/infrastructure/secondary/supervision/HttpDonneesDeSupervision';

export const supervisionAtelierProvider: Provider[] = [
  ApiClient,
  { provide: DonneesDeSupervisionPort, useClass: HttpDonneesDeSupervision },
];
