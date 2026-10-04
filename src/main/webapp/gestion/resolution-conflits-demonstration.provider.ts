import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Provider } from '@angular/core';
import { ApplicationActePort, PrevisualisationConflitPort } from './contexts/resolution-conflits/domain/acte/ConflitsActesPorts';
import { ConflitsReadPort } from './contexts/resolution-conflits/domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from './contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { DemonstrationConflitsPort } from './contexts/resolution-conflits/domain/dossier/DemonstrationConflitsPort';
import { InMemoryConflits } from './contexts/resolution-conflits/infrastructure/secondary/InMemoryConflits';
import { TokenConflitsRights } from './contexts/resolution-conflits/infrastructure/secondary/TokenConflitsRights';

export const resolutionConflitsDemonstrationProvider: Provider[] = [
  { provide: ConflitsRightsPort, useClass: TokenConflitsRights },
  {
    provide: InMemoryConflits,
    useFactory: (droits: ConflitsRightsPort, errors: ErrorHandlerPort) => new InMemoryConflits(droits, errors),
    deps: [ConflitsRightsPort, ErrorHandlerPort],
  },
  { provide: ConflitsReadPort, useExisting: InMemoryConflits },
  { provide: PrevisualisationConflitPort, useExisting: InMemoryConflits },
  { provide: ApplicationActePort, useExisting: InMemoryConflits },
  { provide: DemonstrationConflitsPort, useExisting: InMemoryConflits },
];
