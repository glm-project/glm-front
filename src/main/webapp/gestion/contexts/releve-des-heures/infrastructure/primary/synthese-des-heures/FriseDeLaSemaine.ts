import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';

const MINUTES_PAR_HEURE = 60;
const MINUTES_PAR_JOUR = 24 * MINUTES_PAR_HEURE;
const PAS_DES_REPERES = 2 * MINUTES_PAR_HEURE;
const DEBUT_DE_TRAVAIL = 6 * MINUTES_PAR_HEURE;
const FIN_DE_TRAVAIL = 22 * MINUTES_PAR_HEURE;

export interface PieceDePlage {
  readonly gauche: number;
  readonly largeur: number;
}

export interface PlageDessinee {
  readonly pause: boolean;
  readonly ouverte: boolean;
  readonly pieces: readonly PieceDePlage[];
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

/** Minuit ferme la journée : le repère de fin se nomme `00:00`, jamais `24:00`, qui n'est l'heure de personne. */
const libelleDuRepere = (minutes: number): string => {
  const heure = Math.floor(minutes / MINUTES_PAR_HEURE) % 24;
  return `${String(heure).padStart(2, '0')}:00`;
};

interface Fenetre {
  readonly debut: number;
  readonly fin: number;
}

const JOURNEE_DE_TRAVAIL: Fenetre = { debut: DEBUT_DE_TRAVAIL, fin: FIN_DE_TRAVAIL };
const JOURNEE_ENTIERE: Fenetre = { debut: 0, fin: MINUTES_PAR_JOUR };

const depasseLaJourneeDeTravail = (bornes: readonly number[]): boolean =>
  Math.min(...bornes) < DEBUT_DE_TRAVAIL || Math.max(...bornes) > FIN_DE_TRAVAIL;

const ancrageDe = (gauche: number): AncrageDuRepere => {
  if (gauche === 0) {
    return 'gauche';
  }
  return gauche === 100 ? 'droite' : 'centre';
};

/**
 * L'axe d'une frise hebdomadaire. Il est ancré sur la journée de travail, de 6 h à 22 h, pour que deux semaines
 * se comparent et que l'étendue ne change pas sous les yeux du lecteur. Il s'ouvre sur la journée entière dès
 * qu'un pointage tombe en dehors — une équipe de nuit resterait invisible sur une fenêtre figée, et personne ne
 * verrait qu'il manque quelque chose.
 */
export class FriseDeLaSemaine {
  readonly debut: number;
  readonly fin: number;

  constructor(jours: readonly JourDeReleve[]) {
    const plages = jours.flatMap(jour => [...jour.plages()]);
    const fenetre = FriseDeLaSemaine.fenetreDe(plages);
    this.debut = fenetre.debut;
    this.fin = fenetre.fin;
  }

  private static fenetreDe(plages: readonly PlageDeReleve[]): Fenetre {
    if (plages.some(franchitMinuit)) {
      return JOURNEE_ENTIERE;
    }
    const bornes = bornesDe(plages);
    if (bornes.length === 0) {
      return JOURNEE_DE_TRAVAIL;
    }
    return depasseLaJourneeDeTravail(bornes) ? JOURNEE_ENTIERE : JOURNEE_DE_TRAVAIL;
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
