import { ConflitsRightsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { resolutionConflitsDemonstrationProvider } from '@/gestion/resolution-conflits-demonstration.provider';
import { Provider } from '@angular/core';

declare global {
  interface Window {
    gestionConflitsGestionnaire?: boolean;
  }
}

export const resolutionConflitsProvider: Provider[] = [
  ...resolutionConflitsDemonstrationProvider,
  { provide: ConflitsRightsPort, useFactory: () => ({ canApply: () => window.gestionConflitsGestionnaire !== false }) },
];
