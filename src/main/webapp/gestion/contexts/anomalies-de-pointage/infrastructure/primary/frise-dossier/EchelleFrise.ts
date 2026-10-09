import { formatInstantShortWeekdayDayMonth, formatInstantTime } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { ActiviteEchue, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

const UNE_MINUTE = 60_000;
const UNE_HEURE = 3_600_000;
const CINQ_MINUTES = 300_000;
const MARGE_DES_REPERES_PX = 22;
const POSITION_DU_BORD = 100;
const ECART_MINIMAL_ENTRE_GRADUATIONS_PX = 64;
const HEURES_PAR_JOUR = 24;
const PAS_DE_GRADUATION_EN_HEURES: readonly number[] = [1, 2, 3, 4, 6, 12, 24, 48, 72, 168];
const PLUS_GRAND_PAS_EN_HEURES = 168;

export interface EchelleFrise {
  readonly debut: number;
  readonly fin: number;
}

export interface Graduation {
  readonly instant: number;
  readonly gauche: number;
  readonly heure: string;
  readonly jour: string | undefined;
}

const heureEntiereAvant = (instant: number): number => {
  const date = new Date(instant);
  return instant - date.getMinutes() * UNE_MINUTE - date.getSeconds() * 1000 - date.getMilliseconds();
};

const heureEntiereApres = (instant: number): number => {
  const avant = heureEntiereAvant(instant);
  return avant === instant ? instant : avant + UNE_HEURE;
};

export const instantsRecus = (pointages: readonly PointageAnomalie[], activite: ActiviteEchue): readonly number[] =>
  [...pointages.map(pointage => pointage.fait.instant), activite.debut, activite.echeance]
    .map(instant => Date.parse(instant))
    .filter(Number.isFinite);

export const echelleDe = (instants: readonly number[], plafondElargi?: number): EchelleFrise => {
  const finNormale = heureEntiereApres(Math.max(...instants) + UNE_HEURE);
  return {
    debut: heureEntiereAvant(Math.min(...instants) - UNE_HEURE),
    fin: plafondElargi === undefined ? finNormale : Math.max(finNormale, heureEntiereApres(plafondElargi)),
  };
};

export const pixelsParHeureDe = (echelle: EchelleFrise, largeur: number): number => largeur / ((echelle.fin - echelle.debut) / UNE_HEURE);

export const positionSur = (echelle: EchelleFrise, instant: number): number =>
  ((instant - echelle.debut) / (echelle.fin - echelle.debut)) * 100;

export const positionTenueAuxBords = (position: number, largeur: number): number => {
  const marge = (MARGE_DES_REPERES_PX / largeur) * POSITION_DU_BORD;
  return Math.min(Math.max(position, marge), POSITION_DU_BORD - marge);
};

export const instantSousLePointeur = (
  echelle: EchelleFrise,
  plan: { readonly left: number; readonly width: number },
  abscisse: number,
): number => {
  const instant = echelle.debut + ((abscisse - plan.left) / plan.width) * (echelle.fin - echelle.debut);
  return Math.round(instant / CINQ_MINUTES) * CINQ_MINUTES;
};

const ecartEnPixels = (premier: number, second: number, pixelsParHeure: number): number =>
  (Math.abs(second - premier) / UNE_HEURE) * pixelsParHeure;

const graduationHoraire = (echelle: EchelleFrise, rang: number): Graduation => {
  const instant = echelle.debut + rang * UNE_HEURE;
  const date = new Date(instant);
  return {
    instant,
    gauche: positionSur(echelle, instant),
    heure: formatInstantTime(date),
    jour: date.getHours() === 0 ? formatInstantShortWeekdayDayMonth(date) : undefined,
  };
};

const pasDeGraduationEnHeures = (pixelsParHeure: number): number =>
  PAS_DE_GRADUATION_EN_HEURES.find(pas => pas * pixelsParHeure >= ECART_MINIMAL_ENTRE_GRADUATIONS_PX) ?? PLUS_GRAND_PAS_EN_HEURES;

const jourCivil = (date: Date): number => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

const joursDepuis = (debut: Date, date: Date): number => Math.round((jourCivil(date) - jourCivil(debut)) / (HEURES_PAR_JOUR * UNE_HEURE));

const estMinuit = (graduation: Graduation): boolean => graduation.jour !== undefined;

const estMinuitDUnJourDuPas = (graduation: Graduation, debut: Date, pasEnHeures: number): boolean =>
  estMinuit(graduation) && joursDepuis(debut, new Date(graduation.instant)) % (pasEnHeures / HEURES_PAR_JOUR) === 0;

const estMultipleDuPas = (graduation: Graduation, debut: Date, pasEnHeures: number): boolean =>
  pasEnHeures < HEURES_PAR_JOUR
    ? new Date(graduation.instant).getHours() % pasEnHeures === 0
    : estMinuitDUnJourDuPas(graduation, debut, pasEnHeures);

const laisseLaPlace = (derniere: Graduation | undefined, graduation: Graduation, pixelsParHeure: number): boolean =>
  derniere === undefined || ecartEnPixels(derniere.instant, graduation.instant, pixelsParHeure) >= ECART_MINIMAL_ENTRE_GRADUATIONS_PX;

const ajouteEnEspacant = (gardees: readonly Graduation[], graduation: Graduation, pixelsParHeure: number): readonly Graduation[] => {
  if (laisseLaPlace(gardees.at(-1), graduation, pixelsParHeure)) return [...gardees, graduation];
  return estMinuit(graduation) ? ajouteEnEspacant(gardees.slice(0, -1), graduation, pixelsParHeure) : gardees;
};

export const graduationsDe = (echelle: EchelleFrise, largeur: number): readonly Graduation[] => {
  const pixelsParHeure = pixelsParHeureDe(echelle, largeur);
  const pas = pasDeGraduationEnHeures(pixelsParHeure);
  const debut = new Date(echelle.debut);
  return Array.from({ length: Math.ceil((echelle.fin - echelle.debut) / UNE_HEURE) + 1 }, (_, rang) => graduationHoraire(echelle, rang))
    .filter(graduation => estMultipleDuPas(graduation, debut, pas))
    .reduce<readonly Graduation[]>((gardees, graduation) => ajouteEnEspacant(gardees, graduation, pixelsParHeure), []);
};
