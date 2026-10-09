import { DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { periodeDeLAnomalie } from './PeriodeDeLAnomalie';

export const jourDeLaJournee = (dossier: DossierAnomalie): string => periodeDeLAnomalie(dossier).jourDebut;
