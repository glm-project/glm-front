import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PauseDeReleve } from '../../../domain/releve/PauseDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';

const MINUTES_PAR_HEURE = 60;
const MINUTES_PAR_JOUR = 24 * MINUTES_PAR_HEURE;

/** L'ancrage d'un repère : les extrémités de l'axe se collent à son bord, faute de quoi elles sont coupées. */
export type AncrageDuRepere = 'haut' | 'centre' | 'bas';

export interface RepereHoraire {
  readonly minutes: number;
  readonly libelle: string;
  readonly haut: number;
  readonly ancrage: AncrageDuRepere;
}

/** La hauteur rendue classe une plage : ses heures en haut et en bas, sur une ligne, ou dans une note. */
export type ClasseDeHauteur = 'longue' | 'moyenne' | 'courte';

/** Où se pose une note ou une puce par rapport à ce qu'elle nomme ; `dessus` quand dessous ne tient pas. */
export type Placement = 'dessous' | 'dessus';

export interface DessinDePlage {
  readonly kind: 'PLAGE';
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve;
  readonly presumee: boolean;
  readonly haut: number;
  readonly hauteur: number;
  readonly classe: ClasseDeHauteur;
  readonly depuisLaVeille: boolean;
  readonly seLePoursuit: boolean;
}

/** Une plage sans fin : l'opérateur est encore là. Un repère sans hauteur, qui n'invente aucun temps. */
export interface DessinDePlageEnCours {
  readonly kind: 'PLAGE_EN_COURS';
  readonly debut: InstantDeReleve;
  readonly haut: number;
  readonly puce: PositionDEtiquette;
}

export interface DessinDePause {
  readonly kind: 'PAUSE';
  readonly debut: InstantDeReleve | undefined;
  readonly fin: InstantDeReleve;
  readonly haut: number;
  readonly hauteur: number;
  readonly depuisLaVeille: boolean;
  readonly etiquetee: boolean;
}

/**
 * Une pause que le jour ne reprend pas : le front ne distingue pas une pause qui passe minuit d'une pause en cours ou
 * d'une journée abandonnée pendant sa pause. Un repère sans hauteur ; aujourd'hui, elle est en cours.
 */
export interface DessinDePauseSansReprise {
  readonly kind: 'PAUSE_SANS_REPRISE';
  readonly debut: InstantDeReleve;
  readonly haut: number;
  readonly enCours: boolean;
  readonly puce: PositionDEtiquette;
}

export interface PositionDEtiquette {
  readonly haut: number;
  readonly placement: Placement;
}

export interface NoteDePlagesCourtes {
  readonly plages: readonly DessinDePlage[];
  readonly haut: number;
  readonly placement: Placement;
}

export type Dessin = DessinDePlage | DessinDePlageEnCours | DessinDePause | DessinDePauseSansReprise;

export interface ColonneDessinee {
  readonly dessins: readonly Dessin[];
  readonly notes: readonly NoteDePlagesCourtes[];
}

interface Encombrement {
  readonly haut: number;
  readonly hauteur: number;
}

const HAUTEUR_LONGUE = 36;
const HAUTEUR_MOYENNE = 18;
const HAUTEUR_MINIMALE = 3;
const ECART_ENTRE_COURTES = 18;
const ECART_DE_L_ETIQUETTE = 6;
const MARGE_DE_L_ETIQUETTE = 8;
const HAUTEUR_DE_LIGNE = 16;
const HAUTEUR_DE_L_ETIQUETTE_DE_PAUSE = 16;
const LIGNES_D_UNE_PUCE_EN_COURS = 2;
const LIGNES_D_UNE_PUCE_SANS_REPRISE = 1;

interface Fenetre {
  readonly debut: number;
  readonly fin: number;
  readonly pixelsParHeure: number;
  readonly pasDesReperes: number;
}

const HEURES_DE_JOUR: Fenetre = { debut: 6 * MINUTES_PAR_HEURE, fin: 22 * MINUTES_PAR_HEURE, pixelsParHeure: 28, pasDesReperes: 120 };
const JOUR_ENTIER: Fenetre = { debut: 0, fin: MINUTES_PAR_JOUR, pixelsParHeure: 20, pasDesReperes: 180 };

const minutesDe = (date: Date): number => date.getHours() * MINUTES_PAR_HEURE + date.getMinutes();

const debutDe = (plage: PlageDeReleve): number => minutesDe(plage.debut.value);

/**
 * Le back coupe à minuit une plage qui le passe : sa borne de fin est alors l'instant du lendemain à 00:00. Elle
 * ferme le jour et vaut 1 440 minutes ; lue comme une heure, elle vaudrait 0 et la plage finirait avant de commencer.
 */
const minutesDeFin = (debut: InstantDeReleve, fin: InstantDeReleve): number =>
  fin.value.toDateString() === debut.value.toDateString() ? minutesDe(fin.value) : MINUTES_PAR_JOUR;

/** Une pause venue de la veille commence à minuit : le front ne connaît pas cet instant, seulement son absence. */
const debutDeLaPause = (pause: PauseDeReleve): number => (pause.debut === undefined ? 0 : minutesDe(pause.debut.value));

const bornesDeLaPlage = (plage: PlageDeReleve): readonly number[] =>
  plage.fin === undefined ? [debutDe(plage)] : [debutDe(plage), minutesDeFin(plage.debut, plage.fin)];

const bornesDeLaPause = (pause: PauseDeReleve): readonly number[] =>
  pause.fin === undefined ? [debutDeLaPause(pause)] : [debutDeLaPause(pause), minutesDe(pause.fin.value)];

const bornesDu = (jour: JourDeReleve): readonly number[] => [
  ...jour.plages.flatMap(bornesDeLaPlage),
  ...jour.pauses().flatMap(bornesDeLaPause),
];

const sortDesHeuresDeJour = (bornes: readonly number[]): boolean =>
  Math.min(...bornes) < HEURES_DE_JOUR.debut || Math.max(...bornes) > HEURES_DE_JOUR.fin;

const classeDe = (hauteur: number): ClasseDeHauteur => {
  if (hauteur >= HAUTEUR_LONGUE) {
    return 'longue';
  }
  return hauteur >= HAUTEUR_MOYENNE ? 'moyenne' : 'courte';
};

const basDe = (encombrement: Encombrement): number => encombrement.haut + encombrement.hauteur;

const prolongeLeGroupe = (precedente: DessinDePlage | undefined, plage: DessinDePlage): boolean =>
  precedente?.classe === 'courte' && plage.haut - basDe(precedente) < ECART_ENTRE_COURTES;

const rejointLeGroupe = (
  groupe: DessinDePlage[] | undefined,
  precedente: DessinDePlage | undefined,
  plage: DessinDePlage,
): groupe is DessinDePlage[] => groupe !== undefined && prolongeLeGroupe(precedente, plage);

/** Des plages courtes consécutives et proches partagent une note : une par plage se chevaucheraient. */
const groupesDeCourtes = (plages: readonly DessinDePlage[]): readonly (readonly DessinDePlage[])[] =>
  plages.reduce<DessinDePlage[][]>((groupes, plage, rang) => {
    if (plage.classe !== 'courte') {
      return groupes;
    }
    const groupe = groupes.at(-1);
    if (rejointLeGroupe(groupe, plages[rang - 1], plage)) {
      groupe.push(plage);
      return groupes;
    }
    return [...groupes, [plage]];
  }, []);

const hauteurDEtiquette = (lignes: number): number => MARGE_DE_L_ETIQUETTE + HAUTEUR_DE_LIGNE * lignes;

/** Minuit ferme la journée : le repère de fin se nomme `00:00`, jamais `24:00`, qui n'est l'heure de personne. */
const libelleDuRepere = (minutes: number): string => {
  const heure = Math.floor(minutes / MINUTES_PAR_HEURE) % 24;
  return `${String(heure).padStart(2, '0')}:00`;
};

/**
 * L'agenda de la semaine : un axe vertical commun aux sept colonnes, et la place de chaque dessin en pixels. Il est
 * ancré sur les heures de jour, de 6 h à 22 h, pour que deux semaines se comparent et que l'étendue ne change pas
 * sous les yeux du lecteur. Il s'ouvre sur le jour entier dès qu'une borne de plage ou de pause tombe en dehors, ce
 * qui comprend tout ce qui touche minuit — une équipe de nuit resterait invisible sur une fenêtre figée.
 *
 * Aucune durée n'en sort : une hauteur est une géométrie de dessin, jamais un chiffre affiché.
 */
export class AgendaDeLaSemaine {
  readonly debut: number;
  readonly fin: number;
  readonly pixelsParHeure: number;
  readonly hauteur: number;
  private readonly pasDesReperes: number;

  constructor(jours: readonly JourDeReleve[]) {
    const fenetre = AgendaDeLaSemaine.fenetreDe(jours.flatMap(bornesDu));
    this.debut = fenetre.debut;
    this.fin = fenetre.fin;
    this.pixelsParHeure = fenetre.pixelsParHeure;
    this.pasDesReperes = fenetre.pasDesReperes;
    this.hauteur = this.hautDe(fenetre.fin);
  }

  private static fenetreDe(bornes: readonly number[]): Fenetre {
    if (bornes.length === 0) {
      return HEURES_DE_JOUR;
    }
    return sortDesHeuresDeJour(bornes) ? JOUR_ENTIER : HEURES_DE_JOUR;
  }

  reperes(): readonly RepereHoraire[] {
    const nombre = (this.fin - this.debut) / this.pasDesReperes + 1;
    return Array.from({ length: nombre }, (_, rang) => this.debut + rang * this.pasDesReperes).map(minutes => {
      const haut = this.hautDe(minutes);
      return { minutes, libelle: libelleDuRepere(minutes), haut, ancrage: this.ancrageDe(haut) };
    });
  }

  /** Les dessins d'un jour dans l'ordre des heures, comme l'œil lit la colonne, et les notes de ses plages courtes. */
  colonne(jour: JourDeReleve, estAujourdhui: boolean): ColonneDessinee {
    const pauses = jour.pauses();
    const plages = jour.plages.flatMap(plage => this.dessineLaPlage(plage));
    const encombrants = [...plages, ...pauses.flatMap(pause => this.dessineLaPause(pause))];
    const reperes = [
      ...jour.plages.flatMap(plage => this.marqueLaPlageEnCours(plage, encombrants)),
      ...pauses.flatMap(pause => this.marqueLaPauseSansReprise(pause, estAujourdhui, encombrants)),
    ];
    const dessins = [...encombrants, ...reperes].sort((un, autre) => un.haut - autre.haut);
    return { dessins, notes: this.notesDe(plages, encombrants) };
  }

  /** Une plage courte est dessinée à sa vraie hauteur, trois pixels au moins, et nommée par une note. */
  private dessineLaPlage(plage: PlageDeReleve): readonly DessinDePlage[] {
    if (plage.fin === undefined) {
      return [];
    }
    const debut = debutDe(plage);
    const fin = minutesDeFin(plage.debut, plage.fin);
    const haut = this.hautDe(debut);
    const hauteur = this.hautDe(fin) - haut;
    return [
      {
        kind: 'PLAGE',
        debut: plage.debut,
        fin: plage.fin,
        presumee: plage.presumee,
        haut,
        hauteur: Math.max(hauteur, HAUTEUR_MINIMALE),
        classe: classeDe(hauteur),
        depuisLaVeille: debut === 0,
        seLePoursuit: fin === MINUTES_PAR_JOUR,
      },
    ];
  }

  private dessineLaPause(pause: PauseDeReleve): readonly DessinDePause[] {
    if (pause.fin === undefined) {
      return [];
    }
    const haut = this.hautDe(debutDeLaPause(pause));
    const hauteur = this.hautDe(minutesDe(pause.fin.value)) - haut;
    return [
      {
        kind: 'PAUSE',
        debut: pause.debut,
        fin: pause.fin,
        haut,
        hauteur,
        depuisLaVeille: pause.debut === undefined,
        etiquetee: hauteur >= HAUTEUR_DE_L_ETIQUETTE_DE_PAUSE,
      },
    ];
  }

  private marqueLaPlageEnCours(plage: PlageDeReleve, obstacles: readonly Encombrement[]): readonly DessinDePlageEnCours[] {
    if (!plage.estOuverte()) {
      return [];
    }
    const haut = this.hautDe(debutDe(plage));
    return [
      {
        kind: 'PLAGE_EN_COURS',
        debut: plage.debut,
        haut,
        puce: this.placeUneEtiquette({ haut, hauteur: 0 }, LIGNES_D_UNE_PUCE_EN_COURS, obstacles),
      },
    ];
  }

  private marqueLaPauseSansReprise(
    pause: PauseDeReleve,
    enCours: boolean,
    obstacles: readonly Encombrement[],
  ): readonly DessinDePauseSansReprise[] {
    if (!pause.estSansReprise()) {
      return [];
    }
    const haut = this.hautDe(minutesDe(pause.debut.value));
    const lignes = enCours ? LIGNES_D_UNE_PUCE_EN_COURS : LIGNES_D_UNE_PUCE_SANS_REPRISE;
    return [
      {
        kind: 'PAUSE_SANS_REPRISE',
        debut: pause.debut,
        haut,
        enCours,
        puce: this.placeUneEtiquette({ haut, hauteur: 0 }, lignes, obstacles),
      },
    ];
  }

  private notesDe(plages: readonly DessinDePlage[], obstacles: readonly Encombrement[]): readonly NoteDePlagesCourtes[] {
    return groupesDeCourtes(plages).map(groupe => {
      const haut = Math.min(...groupe.map(plage => plage.haut));
      const bas = Math.max(...groupe.map(basDe));
      return { plages: groupe, ...this.placeUneEtiquette({ haut, hauteur: bas - haut }, groupe.length, obstacles) };
    });
  }

  /**
   * Une note ou une puce se pose sous ce qu'elle nomme, et au-dessus quand elle y heurterait le bloc suivant ou
   * sortirait de la grille. Si le dessus sort aussi de la grille, elle reste dessous.
   */
  private placeUneEtiquette(nommee: Encombrement, lignes: number, obstacles: readonly Encombrement[]): PositionDEtiquette {
    const hauteur = hauteurDEtiquette(lignes);
    const dessous = basDe(nommee) + ECART_DE_L_ETIQUETTE;
    if (!this.gene({ haut: dessous, hauteur }, basDe(nommee), obstacles)) {
      return { haut: dessous, placement: 'dessous' };
    }
    const dessus = nommee.haut - ECART_DE_L_ETIQUETTE - hauteur;
    return dessus >= 0 ? { haut: dessus, placement: 'dessus' } : { haut: dessous, placement: 'dessous' };
  }

  private gene(etiquette: Encombrement, depuis: number, obstacles: readonly Encombrement[]): boolean {
    return basDe(etiquette) > this.hauteur || obstacles.some(obstacle => obstacle.haut >= depuis && obstacle.haut < basDe(etiquette));
  }

  private ancrageDe(haut: number): AncrageDuRepere {
    if (haut === 0) {
      return 'haut';
    }
    return haut === this.hauteur ? 'bas' : 'centre';
  }

  private hautDe(minutes: number): number {
    const borne = Math.min(Math.max(minutes, this.debut), this.fin);
    return ((borne - this.debut) * this.pixelsParHeure) / MINUTES_PAR_HEURE;
  }
}
