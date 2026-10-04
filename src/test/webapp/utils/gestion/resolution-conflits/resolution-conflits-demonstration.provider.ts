import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ApplicationActePort, PrevisualisationConflitPort } from '@/gestion/contexts/resolution-conflits/domain/acte/ConflitsActesPorts';
import { ConflitsReadPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { DemonstrationConflitsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/DemonstrationConflitsPort';
import { InMemoryConflits } from '@/gestion/contexts/resolution-conflits/infrastructure/secondary/InMemoryConflits';
import { TokenConflitsRights } from '@/gestion/contexts/resolution-conflits/infrastructure/secondary/TokenConflitsRights';
import { Provider } from '@angular/core';

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
