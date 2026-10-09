import { localCalendarDay } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { DossierAnomalie } from '../../domain/dossier/DossierAnomalie';

export const jourDeLaJournee = (dossier: DossierAnomalie): string => localCalendarDay(new Date(dossier.activite.debut));
