import {
  formatCalendarDayFull,
  formatCalendarDayFullWithYear,
  formatInstantTime,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { DossierAnomalie } from '../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from './LibellesAnomalies';
import { jourLocalDe, PeriodeDeLAnomalie, periodeDeLAnomalie } from './PeriodeDeLAnomalie';

const CONTEXTE = LIBELLES_ANOMALIES.frise.contexte;

type Quand = 'PLUS_TOT' | 'PENDANT' | 'PLUS_TARD' | 'JOURS_PRECEDENTS' | 'JOURS_SUIVANTS';

interface Cadre extends PeriodeDeLAnomalie {
  readonly maintenant: Date;
}

interface Groupe {
  readonly nombre: number;
  readonly texte: () => string;
}

const heureDe = (instant: number): string => formatInstantTime(new Date(instant));

const jourDit = (instant: number, maintenant: Date): string => {
  const jour = jourLocalDe(instant);
  return new Date(instant).getFullYear() === maintenant.getFullYear() ? formatCalendarDayFull(jour) : formatCalendarDayFullWithYear(jour);
};

const quandDe = (instant: number, periode: PeriodeDeLAnomalie): Quand => {
  if (instant < periode.debut) return jourLocalDe(instant) === periode.jourDebut ? 'PLUS_TOT' : 'JOURS_PRECEDENTS';
  if (instant <= periode.fin) return 'PENDANT';
  return jourLocalDe(instant) === periode.jourFin ? 'PLUS_TARD' : 'JOURS_SUIVANTS';
};

const jourDeLaPeriode = (cadre: Cadre, instant: number): string =>
  cadre.jourDebut === cadre.jourFin ? CONTEXTE.ceJourLa : CONTEXTE.le(jourDit(instant, cadre.maintenant));

const desDeuxCotes = (precedents: readonly number[], suivants: readonly number[]): boolean => precedents.length > 0 && suivants.length > 0;

const autresJours = (precedents: readonly number[], suivants: readonly number[], maintenant: Date): string => {
  if (desDeuxCotes(precedents, suivants)) return CONTEXTE.autresJours;
  return suivants.length > 0
    ? CONTEXTE.suivants(jourDit(Math.max(...suivants), maintenant))
    : CONTEXTE.precedents(jourDit(Math.min(...precedents), maintenant));
};

const parQuand = (instants: readonly number[], periode: PeriodeDeLAnomalie): Readonly<Record<Quand, readonly number[]>> => ({
  PLUS_TOT: instants.filter(instant => quandDe(instant, periode) === 'PLUS_TOT'),
  PENDANT: instants.filter(instant => quandDe(instant, periode) === 'PENDANT'),
  PLUS_TARD: instants.filter(instant => quandDe(instant, periode) === 'PLUS_TARD'),
  JOURS_PRECEDENTS: instants.filter(instant => quandDe(instant, periode) === 'JOURS_PRECEDENTS'),
  JOURS_SUIVANTS: instants.filter(instant => quandDe(instant, periode) === 'JOURS_SUIVANTS'),
});

const groupesDe = (instants: readonly number[], cadre: Cadre): readonly Groupe[] => {
  const { PLUS_TOT, PENDANT, PLUS_TARD, JOURS_PRECEDENTS, JOURS_SUIVANTS } = parQuand(instants, cadre);
  return [
    {
      nombre: PLUS_TOT.length,
      texte: () => CONTEXTE.plusTot(jourDeLaPeriode(cadre, cadre.debut), heureDe(Math.min(...PLUS_TOT))),
    },
    { nombre: PENDANT.length, texte: () => CONTEXTE.pendant },
    {
      nombre: PLUS_TARD.length,
      texte: () => CONTEXTE.plusTard(jourDeLaPeriode(cadre, cadre.fin), heureDe(Math.max(...PLUS_TARD))),
    },
    {
      nombre: JOURS_PRECEDENTS.length + JOURS_SUIVANTS.length,
      texte: () => autresJours(JOURS_PRECEDENTS, JOURS_SUIVANTS, cadre.maintenant),
    },
  ].filter(groupe => groupe.nombre > 0);
};

const dit = ({ nombre, texte }: Groupe, premier: boolean): string => `${premier ? CONTEXTE.pointages(nombre) : nombre} ${texte()}`;

const joints = (groupes: readonly string[]): string => {
  const precedents = groupes.slice(0, -1);
  const dernier = groupes.slice(-1).join('');
  return precedents.length === 0 ? dernier : `${precedents.join(CONTEXTE.virgule)}${CONTEXTE.et}${dernier}`;
};

export const contexteDuSuivi = (dossier: DossierAnomalie, maintenant: Date, operateur: string | undefined): string | undefined => {
  const periode = periodeDeLAnomalie(dossier);
  const instants = dossier.perimetre
    .horsDe(dossier)
    .map(pointage => Date.parse(pointage.fait.instant))
    .filter(Number.isFinite);
  const groupes = periode === undefined ? [] : groupesDe(instants, { ...periode, maintenant });
  if (groupes.length === 0) return undefined;
  return CONTEXTE.phrase(operateur ?? CONTEXTE.operateurInconnu, joints(groupes.map((groupe, rang) => dit(groupe, rang === 0))));
};
