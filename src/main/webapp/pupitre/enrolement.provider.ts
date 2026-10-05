import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { chargementProviders } from '@/pupitre/contexts/enrolement/infrastructure/secondary/atelier/chargement.providers';
import { journauxProviders } from '@/pupitre/contexts/enrolement/infrastructure/secondary/atelier/journaux.providers';
import { Provider } from '@angular/core';

export const enrolementProvider: Provider[] = [...chargementProviders, ...journauxProviders, EnrolementDuPupitre];
