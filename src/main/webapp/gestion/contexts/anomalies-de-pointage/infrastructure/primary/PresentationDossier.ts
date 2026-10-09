import { formatInstantTime } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { InstantLongDayPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { ActiviteAnomalie, FaitDePointage } from '../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';

type CategorieActivite = NonNullable<ActiviteAnomalie['periode']>['categorie'];

const instantLongDay = new InstantLongDayPipe();

export const heureDe = (instant: string): string => {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? instant : formatInstantTime(date);
};

export const libelleDuGeste = (fait: Pick<FaitDePointage, 'type'>): string => LIBELLES_ANOMALIES.gestes[fait.type];

export const libelleCategorie = (categorie: CategorieActivite): string =>
  categorie === 'TRAVAIL' ? LIBELLES_ANOMALIES.types.DEBUT : LIBELLES_ANOMALIES.types.NON_CONFORMITE;

export const libelleActivite = (activite: ActiviteAnomalie, now: Date): string => {
  const periode = activite.periode;
  if (periode === undefined) return activite.libelle;
  const categorie = libelleCategorie(periode.categorie);
  const fin = periode.fin === undefined ? '' : ` → ${instantLongDay.transform(periode.fin, now)}`;
  return `${categorie} · ${instantLongDay.transform(periode.debut, now)}${fin}`;
};
