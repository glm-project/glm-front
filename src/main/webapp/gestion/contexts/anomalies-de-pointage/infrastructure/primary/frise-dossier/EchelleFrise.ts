import { formatInstantShortWeekdayDayMonth, formatInstantTime } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { ActiviteAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';

const UNE_MINUTE = 60_000;
const UNE_HEURE = 3_600_000;
const TROIS_HEURES = 3 * UNE_HEURE;
const CINQ_MINUTES = 300_000;
const LARGEUR_MINIMALE_PAR_HEURE_PX = 64;
const LARGEUR_D_UN_REPERE_PX = 44;

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

export const instantsRecus = (journal: readonly PointageAnomalie[], activites: readonly ActiviteAnomalie[]): readonly number[] =>
  [...journal.map(pointage => pointage.fait.instant), ...activites.flatMap(activite => [activite.periode?.debut, activite.periode?.fin])]
    .flatMap(instant => (instant === undefined ? [] : [Date.parse(instant)]))
    .filter(Number.isFinite);

export const finDeLaPortee = (instants: readonly number[]): number => Math.max(...instants) + TROIS_HEURES;

export const echelleDe = (instants: readonly number[], plafondElargi?: number): EchelleFrise => {
  const finNormale = heureEntiereApres(Math.max(...instants) + UNE_HEURE);
  return {
    debut: heureEntiereAvant(Math.min(...instants) - UNE_HEURE),
    fin:
      plafondElargi === undefined ? finNormale : Math.max(finNormale, heureEntiereApres(Math.min(finDeLaPortee(instants), plafondElargi))),
  };
};

export const largeurMinimaleDe = (echelle: EchelleFrise): number =>
  ((echelle.fin - echelle.debut) / UNE_HEURE) * LARGEUR_MINIMALE_PAR_HEURE_PX;

export const positionSur = (echelle: EchelleFrise, instant: number): number =>
  ((instant - echelle.debut) / (echelle.fin - echelle.debut)) * 100;

export const instantSousLePointeur = (
  echelle: EchelleFrise,
  plan: { readonly left: number; readonly width: number },
  abscisse: number,
): number => {
  const instant = echelle.debut + ((abscisse - plan.left) / plan.width) * (echelle.fin - echelle.debut);
  return Math.round(instant / CINQ_MINUTES) * CINQ_MINUTES;
};

export const graduationsDe = (echelle: EchelleFrise): readonly Graduation[] =>
  Array.from({ length: Math.ceil((echelle.fin - echelle.debut) / UNE_HEURE) + 1 }, (_, rang) => {
    const instant = echelle.debut + rang * UNE_HEURE;
    const date = new Date(instant);
    return {
      instant,
      gauche: positionSur(echelle, instant),
      heure: formatInstantTime(date),
      jour: date.getHours() === 0 ? formatInstantShortWeekdayDayMonth(date) : undefined,
    };
  });

const ecartEnPixels = (premier: number, second: number): number => (Math.abs(second - premier) / UNE_HEURE) * LARGEUR_MINIMALE_PAR_HEURE_PX;

export interface SurUneVoie<Element> {
  readonly element: Element;
  readonly voie: number;
}

export const surVoies = <Element>(
  elements: readonly Element[],
  instantDe: (element: Element) => number,
): readonly SurUneVoie<Element>[] => {
  const dernierParVoie: number[] = [];
  return elements.map(element => {
    const instant = instantDe(element);
    const libre = dernierParVoie.findIndex(dernier => ecartEnPixels(dernier, instant) >= LARGEUR_D_UN_REPERE_PX);
    const voie = libre === -1 ? dernierParVoie.length : libre;
    dernierParVoie[voie] = instant;
    return { element, voie };
  });
};
