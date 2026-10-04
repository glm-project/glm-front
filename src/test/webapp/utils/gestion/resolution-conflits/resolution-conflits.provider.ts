import { ApplicationActePort, PrevisualisationConflitPort } from '@/gestion/contexts/resolution-conflits/domain/acte/ConflitsActesPorts';
import { ConflitsReadPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { DemonstrationConflitsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/DemonstrationConflitsPort';
import { HttpConflits } from '@/gestion/contexts/resolution-conflits/infrastructure/secondary/HttpConflits';
import { InMemoryConflits } from '@/gestion/contexts/resolution-conflits/infrastructure/secondary/InMemoryConflits';
import { resolutionConflitsHttpProvider } from '@/gestion/resolution-conflits-http.provider';
import { inject, Provider } from '@angular/core';
import { resolutionConflitsDemonstrationProvider } from './resolution-conflits-demonstration.provider';

declare global {
  interface Window {
    gestionConflitsGestionnaire?: boolean;
    gestionConflitsSource?: 'HTTP' | 'DEMONSTRATION';
  }
}

const conflitsAdapterFixture = () => (window.gestionConflitsSource === 'HTTP' ? inject(HttpConflits) : inject(InMemoryConflits));

export const resolutionConflitsProvider: Provider[] = [
  ...resolutionConflitsHttpProvider,
  ...resolutionConflitsDemonstrationProvider,
  { provide: ConflitsReadPort, useFactory: conflitsAdapterFixture },
  { provide: PrevisualisationConflitPort, useFactory: conflitsAdapterFixture },
  { provide: ApplicationActePort, useFactory: conflitsAdapterFixture },
  { provide: DemonstrationConflitsPort, useFactory: () => (window.gestionConflitsSource === 'HTTP' ? null : inject(InMemoryConflits)) },
  { provide: ConflitsRightsPort, useFactory: () => ({ canApply: () => window.gestionConflitsGestionnaire !== false }) },
];
