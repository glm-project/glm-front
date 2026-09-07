import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { chargementProviders } from '@/pupitre/contexts/enrolement/infrastructure/secondary/atelier/chargement.providers';
import { DeviceEnrolmentPort } from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { Provider } from '@angular/core';

export const enrolementProvider: Provider[] = [
  ...chargementProviders,
  { provide: DeviceEnrolmentPort, useExisting: AuthenticationPort },
  EnrolementDuPupitre,
];
