import { localCalendarDay } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';

export const jourCourant = (): JourCalendaire => new JourCalendaire(localCalendarDay(new Date()));
