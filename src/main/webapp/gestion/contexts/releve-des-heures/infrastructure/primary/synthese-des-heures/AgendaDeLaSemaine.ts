import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PauseDeReleve } from '../../../domain/releve/PauseDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';

const MINUTES_PAR_HEURE = 60;
const MINUTES_PAR_JOUR = 24 * MINUTES_PAR_HEURE;

export type AncrageDuRepere = 'haut' | 'centre' | 'bas';

export interface RepereHoraire {
  readonly minutes: number;
  readonly libelle: string;
  readonly haut: number;
  readonly ancrage: AncrageDuRepere;
}

export type ClasseDeHauteur = 'longue' | 'moyenne' | 'courte';

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

export interface DessinDePlageEnCours {
  readonly kind: 'PLAGE_EN_COURS';
  readonly debut: InstantDeReleve;
  readonly haut: number;
  readonly puce: PositionDEtiquette;
}

export interface DessinDePause {
  readonly kind: 'PAUSE';
  readonly fin: InstantDeReleve;
  readonly haut: number;
  readonly hauteur: number;
  readonly etiquetee: boolean;
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

export type Dessin = DessinDePlage | DessinDePlageEnCours | DessinDePause;

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

const minutesDeFin = (debut: InstantDeReleve, fin: InstantDeReleve): number =>
  fin.value.toDateString() === debut.value.toDateString() ? minutesDe(fin.value) : MINUTES_PAR_JOUR;

const bornesDeLaPlage = (plage: PlageDeReleve): readonly number[] =>
  plage.fin === undefined ? [debutDe(plage)] : [debutDe(plage), minutesDeFin(plage.debut, plage.fin)];

const bornesDeLaPause = (pause: PauseDeReleve): readonly number[] => [JOUR_ENTIER.debut, minutesDe(pause.fin.value)];

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

const libelleDuRepere = (minutes: number): string => {
  const heure = Math.floor(minutes / MINUTES_PAR_HEURE) % 24;
  return `${String(heure).padStart(2, '0')}:00`;
};

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

  colonne(jour: JourDeReleve): ColonneDessinee {
    const plages = jour.plages.flatMap(plage => this.dessineLaPlage(plage, jour.vientDeLaVeille(plage)));
    const encombrants = [...plages, ...jour.pauses().map(pause => this.dessineLaPause(pause))];
    const reperes = jour.plages.flatMap(plage => this.marqueLaPlageEnCours(plage, encombrants));
    const dessins = [...encombrants, ...reperes].sort((un, autre) => un.haut - autre.haut);
    return { dessins, notes: this.notesDe(plages, encombrants) };
  }

  private dessineLaPlage(plage: PlageDeReleve, depuisLaVeille: boolean): readonly DessinDePlage[] {
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
        depuisLaVeille,
        seLePoursuit: fin === MINUTES_PAR_JOUR,
      },
    ];
  }

  private dessineLaPause(pause: PauseDeReleve): DessinDePause {
    const haut = this.hautDe(JOUR_ENTIER.debut);
    const hauteur = this.hautDe(minutesDe(pause.fin.value)) - haut;
    return { kind: 'PAUSE', fin: pause.fin, haut, hauteur, etiquetee: hauteur >= HAUTEUR_DE_L_ETIQUETTE_DE_PAUSE };
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

  private notesDe(plages: readonly DessinDePlage[], obstacles: readonly Encombrement[]): readonly NoteDePlagesCourtes[] {
    return groupesDeCourtes(plages).map(groupe => {
      const haut = Math.min(...groupe.map(plage => plage.haut));
      const bas = Math.max(...groupe.map(basDe));
      return { plages: groupe, ...this.placeUneEtiquette({ haut, hauteur: bas - haut }, groupe.length, obstacles) };
    });
  }

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
