import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';

const MINUTES_PAR_HEURE = 60;
const MINUTES_PAR_JOUR = 24 * MINUTES_PAR_HEURE;
const PAS_DES_REPERES = 2 * MINUTES_PAR_HEURE;
const DEBUT_DES_HEURES_DE_JOUR = 6 * MINUTES_PAR_HEURE;
const FIN_DES_HEURES_DE_JOUR = 22 * MINUTES_PAR_HEURE;

export interface PlageDessinee {
  readonly presumee: boolean;
  readonly ouverte: boolean;
  readonly gauche: number;
  readonly largeur: number;
}

/** L'ancrage d'un repère : les extrémités de l'axe se collent à son bord, faute de quoi elles sont coupées. */
export type AncrageDuRepere = 'gauche' | 'centre' | 'droite';

export interface RepereHoraire {
  readonly minutes: number;
  readonly libelle: string;
  readonly gauche: number;
  readonly ancrage: AncrageDuRepere;
}

const minutesDe = (date: Date): number => date.getHours() * MINUTES_PAR_HEURE + date.getMinutes();

const debutDe = (plage: PlageDeReleve): number => minutesDe(plage.debut.value);

/**
 * Le back coupe à minuit une plage qui le passe : sa borne de fin est alors l'instant du lendemain à 00:00. Elle
 * ferme le jour et vaut 1 440 minutes ; lue comme une heure, elle vaudrait 0 et la plage finirait avant de commencer.
 */
const finDe = (plage: PlageDeReleve): number | undefined => {
  const fin = plage.fin?.value;
  if (fin === undefined) {
    return undefined;
  }
  return fin.toDateString() === plage.debut.value.toDateString() ? minutesDe(fin) : MINUTES_PAR_JOUR;
};

const bornesDe = (plages: readonly PlageDeReleve[]): readonly number[] =>
  plages.flatMap(plage => {
    const fin = finDe(plage);
    return fin === undefined ? [debutDe(plage)] : [debutDe(plage), fin];
  });

/** Minuit ferme la journée : le repère de fin se nomme `00:00`, jamais `24:00`, qui n'est l'heure de personne. */
const libelleDuRepere = (minutes: number): string => {
  const heure = Math.floor(minutes / MINUTES_PAR_HEURE) % 24;
  return `${String(heure).padStart(2, '0')}:00`;
};

interface Fenetre {
  readonly debut: number;
  readonly fin: number;
}

const HEURES_DE_JOUR: Fenetre = { debut: DEBUT_DES_HEURES_DE_JOUR, fin: FIN_DES_HEURES_DE_JOUR };
const JOUR_ENTIER: Fenetre = { debut: 0, fin: MINUTES_PAR_JOUR };

const sortDesHeuresDeJour = (bornes: readonly number[]): boolean =>
  Math.min(...bornes) < DEBUT_DES_HEURES_DE_JOUR || Math.max(...bornes) > FIN_DES_HEURES_DE_JOUR;

const ancrageDe = (gauche: number): AncrageDuRepere => {
  if (gauche === 0) {
    return 'gauche';
  }
  return gauche === 100 ? 'droite' : 'centre';
};

/**
 * L'axe de l'agenda de la semaine. Il est ancré sur les heures de jour, de 6 h à 22 h, pour que deux semaines
 * se comparent et que l'étendue ne change pas sous les yeux du lecteur. Il s'ouvre sur le jour entier dès
 * qu'une borne de plage tombe en dehors, ce qui comprend une plage qui touche minuit — une équipe de nuit resterait
 * invisible sur une fenêtre figée, et personne ne verrait qu'il manque quelque chose.
 */
export class AgendaDeLaSemaine {
  readonly debut: number;
  readonly fin: number;

  constructor(jours: readonly JourDeReleve[]) {
    const fenetre = AgendaDeLaSemaine.fenetreDe(jours.flatMap(jour => jour.plages));
    this.debut = fenetre.debut;
    this.fin = fenetre.fin;
  }

  private static fenetreDe(plages: readonly PlageDeReleve[]): Fenetre {
    const bornes = bornesDe(plages);
    if (bornes.length === 0) {
      return HEURES_DE_JOUR;
    }
    return sortDesHeuresDeJour(bornes) ? JOUR_ENTIER : HEURES_DE_JOUR;
  }

  reperes(): readonly RepereHoraire[] {
    const premier = Math.ceil(this.debut / PAS_DES_REPERES) * PAS_DES_REPERES;
    const nombre = Math.floor((this.fin - premier) / PAS_DES_REPERES) + 1;
    return Array.from({ length: Math.max(nombre, 0) }, (_, rang) => premier + rang * PAS_DES_REPERES).map(minutes => {
      const gauche = this.pourcentage(minutes);
      return { minutes, libelle: libelleDuRepere(minutes), gauche, ancrage: ancrageDe(gauche) };
    });
  }

  dessine(plage: PlageDeReleve): PlageDessinee {
    const debut = debutDe(plage);
    const gauche = this.pourcentage(debut);
    const largeur = this.pourcentage(finDe(plage) ?? debut) - gauche;
    return { presumee: plage.presumee, ouverte: plage.estOuverte(), gauche, largeur };
  }

  private pourcentage(minutes: number): number {
    const borne = Math.min(Math.max(minutes, this.debut), this.fin);
    return ((borne - this.debut) / (this.fin - this.debut)) * 100;
  }
}
