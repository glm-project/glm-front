import { Provider } from '@angular/core';
import { ApplicationActePort, PrevisualisationConflitPort } from './contexts/resolution-conflits/domain/acte/ConflitsActesPorts';
import { ConflitsReadPort } from './contexts/resolution-conflits/domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from './contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { HttpConflits } from './contexts/resolution-conflits/infrastructure/secondary/HttpConflits';
import { TokenConflitsRights } from './contexts/resolution-conflits/infrastructure/secondary/TokenConflitsRights';

export const resolutionConflitsHttpProvider: Provider[] = [
  { provide: ConflitsRightsPort, useClass: TokenConflitsRights },
  HttpConflits,
  { provide: ConflitsReadPort, useExisting: HttpConflits },
  { provide: PrevisualisationConflitPort, useExisting: HttpConflits },
  { provide: ApplicationActePort, useExisting: HttpConflits },
];
