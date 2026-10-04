import { ConflitsRightsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { resolutionConflitsHttpProvider } from '@/gestion/resolution-conflits-http.provider';
import { Provider } from '@angular/core';

declare global {
  interface Window {
    gestionConflitsGestionnaire?: boolean;
  }
}

export const resolutionConflitsProvider: Provider[] = [
  ...resolutionConflitsHttpProvider,
  { provide: ConflitsRightsPort, useFactory: () => ({ canApply: () => window.gestionConflitsGestionnaire !== false }) },
];
