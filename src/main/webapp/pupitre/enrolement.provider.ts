import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { chargementProviders } from '@/pupitre/contexts/enrolement/infrastructure/secondary/atelier/chargement.providers';
import { Provider } from '@angular/core';

export const enrolementProvider: Provider[] = [...chargementProviders, EnrolementDuPupitre];
