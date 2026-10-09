import { formatInstantTime } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { InstantLongDayPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { ActiviteEchue, FaitDePointage } from '../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';

type CategorieActivite = ActiviteEchue['categorie'];

const instantLongDay = new InstantLongDayPipe();

export const heureDe = (instant: string): string => {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? instant : formatInstantTime(date);
};

export const libelleDuGeste = (fait: Pick<FaitDePointage, 'type'>): string => LIBELLES_ANOMALIES.gestes[fait.type];

export const libelleCategorie = (categorie: CategorieActivite): string =>
  categorie === 'TRAVAIL' ? LIBELLES_ANOMALIES.types.DEBUT : LIBELLES_ANOMALIES.types.NON_CONFORMITE;

export const libelleActivite = (activite: ActiviteEchue, now: Date): string =>
  `${libelleCategorie(activite.categorie)} · ${instantLongDay.transform(activite.debut, now)} → ${instantLongDay.transform(activite.echeance, now)}`;
