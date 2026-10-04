import { ConflitsRightsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { resolutionConflitsHttpProvider } from '@/gestion/resolution-conflits-http.provider';
import { Provider } from '@angular/core';
import { resolutionConflitsDemonstrationProvider } from './resolution-conflits-demonstration.provider';

declare global {
  interface Window {
    gestionConflitsGestionnaire?: boolean;
    gestionConflitsSource?: 'HTTP' | 'DEMONSTRATION';
  }
}

export const resolutionConflitsProvider: Provider[] = [
  ...(window.gestionConflitsSource === 'HTTP' ? resolutionConflitsHttpProvider : resolutionConflitsDemonstrationProvider),
  { provide: ConflitsRightsPort, useFactory: () => ({ canApply: () => window.gestionConflitsGestionnaire !== false }) },
];
