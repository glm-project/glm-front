import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';

const MINUTES_PAR_HEURE = 60;
const MINUTES_PAR_JOUR = 24 * MINUTES_PAR_HEURE;
const AMPLITUDE_MINIMALE = 8 * MINUTES_PAR_HEURE;
const PAS_DES_REPERES = 2 * MINUTES_PAR_HEURE;
const DEBUT_PAR_DEFAUT = 6 * MINUTES_PAR_HEURE;
const FIN_PAR_DEFAUT = 22 * MINUTES_PAR_HEURE;

export interface PieceDePlage {
  readonly gauche: number;
  readonly largeur: number;
}

export interface PlageDessinee {
  readonly pause: boolean;
  readonly ouverte: boolean;
  readonly pieces: readonly PieceDePlage[];
}

export interface RepereHoraire {
  readonly libelle: string;
  readonly gauche: number;
}

const minutesDe = (date: Date): number => date.getHours() * MINUTES_PAR_HEURE + date.getMinutes();

const debutDe = (plage: PlageDeReleve): number => minutesDe(plage.debut.value);

const finDe = (plage: PlageDeReleve): number | undefined => (plage.fin === undefined ? undefined : minutesDe(plage.fin.value));

/** Une plage dont la fin précède le début a franchi minuit : le jour appartient au découpage du back, pas à l'horloge. */
const franchitMinuit = (plage: PlageDeReleve): boolean => {
  const fin = finDe(plage);
  if (fin === undefined) {
    return false;
  }
  return fin < debutDe(plage);
};

const bornesDe = (plages: readonly PlageDeReleve[]): readonly number[] =>
  plages.flatMap(plage => {
    const fin = finDe(plage);
    return fin === undefined ? [debutDe(plage)] : [debutDe(plage), fin];
  });

const arrondiBas = (minutes: number): number => Math.floor(minutes / MINUTES_PAR_HEURE) * MINUTES_PAR_HEURE;
const arrondiHaut = (minutes: number): number => Math.ceil(minutes / MINUTES_PAR_HEURE) * MINUTES_PAR_HEURE;

const libelleDuRepere = (minutes: number): string => `${String(Math.floor(minutes / MINUTES_PAR_HEURE)).padStart(2, '0')}:00`;

/**
 * L'axe d'une frise hebdomadaire. Il se déduit des pointages de la semaine plutôt que d'être figé de 6 h à
 * 22 h : une équipe de nuit tomberait hors d'une fenêtre figée, et personne ne verrait qu'il manque quelque
 * chose. Dès qu'une plage franchit minuit, l'axe couvre la journée entière — c'est le seul repère qui reste
 * juste.
 */
export class FriseDeLaSemaine {
  readonly debut: number;
  readonly fin: number;

  constructor(jours: readonly JourDeReleve[]) {
    const plages = jours.flatMap(jour => [...jour.plages()]);
    const bornes = bornesDe(plages);
    this.debut = FriseDeLaSemaine.debutDeLAxe(bornes, plages);
    this.fin = FriseDeLaSemaine.finDeLAxe(bornes, plages, this.debut);
  }

  private static debutDeLAxe(bornes: readonly number[], plages: readonly PlageDeReleve[]): number {
    if (plages.some(franchitMinuit)) {
      return 0;
    }
    return bornes.length === 0 ? DEBUT_PAR_DEFAUT : arrondiBas(Math.min(...bornes));
  }

  private static finDeLAxe(bornes: readonly number[], plages: readonly PlageDeReleve[], debut: number): number {
    if (plages.some(franchitMinuit)) {
      return MINUTES_PAR_JOUR;
    }
    const brute = bornes.length === 0 ? FIN_PAR_DEFAUT : arrondiHaut(Math.max(...bornes));
    return Math.max(brute, debut + AMPLITUDE_MINIMALE);
  }

  reperes(): readonly RepereHoraire[] {
    const premier = Math.ceil(this.debut / PAS_DES_REPERES) * PAS_DES_REPERES;
    const nombre = Math.floor((this.fin - premier) / PAS_DES_REPERES) + 1;
    return Array.from({ length: Math.max(nombre, 0) }, (_, rang) => premier + rang * PAS_DES_REPERES).map(minutes => ({
      libelle: libelleDuRepere(minutes),
      gauche: this.pourcentage(minutes),
    }));
  }

  dessine(plage: PlageDeReleve): PlageDessinee {
    return { pause: plage.pause, ouverte: plage.estOuverte(), pieces: this.piecesDe(plage) };
  }

  private piecesDe(plage: PlageDeReleve): readonly PieceDePlage[] {
    const debut = debutDe(plage);
    const fin = finDe(plage);
    if (fin === undefined) {
      return [{ gauche: this.pourcentage(debut), largeur: 0 }];
    }
    if (fin < debut) {
      return [this.piece(debut, MINUTES_PAR_JOUR), this.piece(0, fin)];
    }
    return [this.piece(debut, fin)];
  }

  private piece(debut: number, fin: number): PieceDePlage {
    const gauche = this.pourcentage(debut);
    return { gauche, largeur: this.pourcentage(fin) - gauche };
  }

  private pourcentage(minutes: number): number {
    const borne = Math.min(Math.max(minutes, this.debut), this.fin);
    return ((borne - this.debut) / (this.fin - this.debut)) * 100;
  }
}
