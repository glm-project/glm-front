import { localCalendarDay } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { instantsRecus } from './frise-dossier/EchelleFrise';
import { pointagesDeLaFrise } from './frise-dossier/PointagesDeLaFrise';

export interface PeriodeDeLAnomalie {
  readonly debut: number;
  readonly fin: number;
  readonly jourDebut: string;
  readonly jourFin: string;
}

export const jourLocalDe = (instant: number): string => localCalendarDay(new Date(instant));

export const periodeDeLAnomalie = (dossier: DossierAnomalie): PeriodeDeLAnomalie => {
  const recus = instantsRecus(pointagesDeLaFrise(dossier), dossier.activite);
  const debut = Math.min(...recus);
  const fin = Math.max(...recus);
  return { debut, fin, jourDebut: jourLocalDe(debut), jourFin: jourLocalDe(fin) };
};
