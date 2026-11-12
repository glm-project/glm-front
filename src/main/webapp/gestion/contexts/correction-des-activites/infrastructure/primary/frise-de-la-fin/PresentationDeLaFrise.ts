import { formatInstantTime } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { InstantLongDayPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { ActiviteEchue, PointageDuDossier } from '../../../domain/fin-automatique/DossierDeLaFin';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';

const LIBELLES = LIBELLES_CORRECTION_DES_ACTIVITES.regularisation.frise;

const instantLongDay = new InstantLongDayPipe();

export const heureDe = (instant: string): string => {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? instant : formatInstantTime(date);
};

export const libelleDuGeste = (fait: Pick<PointageDuDossier['fait'], 'type'>): string => LIBELLES.gestes[fait.type];

export const libelleCategorie = (categorie: ActiviteEchue['categorie']): string => LIBELLES.types[categorie];

export const libelleActivite = (activite: ActiviteEchue, now: Date): string =>
  `${libelleCategorie(activite.categorie)} · ${instantLongDay.transform(activite.debut, now)} → ${instantLongDay.transform(activite.echeance, now)}`;
