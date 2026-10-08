import { ActiviteAnomalie, DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { EchelleFrise, Graduation } from './EchelleFrise';
import { PlacementDeLInstant, PoigneeDeFrise } from './PoigneeDeFrise';

export type VueDeFrise = Pick<DossierAnomalie, 'journal' | 'perimetre' | 'activites' | 'diagnostics'> & {
  readonly choix?: DossierAnomalie['choix'];
};

export interface EntreesDeFrise {
  readonly vue: VueDeFrise;
  readonly maintenant: Date;
  readonly poignee: PoigneeDeFrise | undefined;
  readonly placement: PlacementDeLInstant | undefined;
  readonly largeur: number;
}

export type FinDeBarre = 'RECUE' | 'AUTOMATIQUE' | 'OUVERTE' | 'PROPOSEE';

export interface BarreFrise {
  readonly kind: 'BARRE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly largeur: number | undefined;
  readonly activite: string;
  readonly texte: string;
  readonly nom: string;
  readonly categorie: CategorieDeBarre | undefined;
  readonly etat: ActiviteAnomalie['etat'];
  readonly fin: FinDeBarre | undefined;
}

export interface RepereFrise {
  readonly kind: 'REPERE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly pointage: string;
  readonly nom: string;
  readonly heure: string;
  readonly symbole: string;
  readonly nonConformite: boolean;
  readonly annule: boolean;
  readonly regularise: boolean;
  readonly enCause: boolean;
  readonly deplace: boolean;
  readonly tardif: boolean;
  readonly ancrage: 'CENTRE' | 'GAUCHE' | 'DROITE';
}

export type RepereASituer = Omit<RepereFrise, 'gauche' | 'haut' | 'ancrage'>;

export type ElementFrise = BarreFrise | RepereFrise | PositionDePoignee;

export interface LectureDePoignee {
  readonly valeur: number;
  readonly texte: string;
}

export interface EmplacementDePoignee {
  readonly kind: 'POIGNEE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly min: number;
  readonly max: number;
  readonly etiquette: string;
  readonly desactivee: boolean;
}

export interface PositionAvecHeure extends EmplacementDePoignee {
  readonly heure: 'AVEC_HEURE';
  readonly lecture: LectureDePoignee;
  readonly source: PoigneeDeFrise;
}

export interface PositionSansHeure extends EmplacementDePoignee {
  readonly heure: 'SANS_HEURE';
  readonly source: PlacementDeLInstant;
}

export type PositionDePoignee = PositionAvecHeure | PositionSansHeure;

export interface RangeeDePlacement {
  readonly haut: number;
  readonly hauteur: number;
  readonly desactivee: boolean;
  readonly source: PlacementDeLInstant;
}

export interface RetraitDeFrise {
  readonly gauche: number;
  readonly largeur: number;
  readonly haut: number;
}

export interface FinRecueDeFrise {
  readonly gauche: number;
  readonly haut: number;
  readonly texte: string;
}

export interface DispositionFrise {
  readonly echelle: EchelleFrise;
  readonly hauteur: number;
  readonly graduations: readonly Graduation[];
  readonly elements: readonly ElementFrise[];
  readonly rangeeDePlacement: RangeeDePlacement | undefined;
  readonly retrait: RetraitDeFrise | undefined;
  readonly finRecue: FinRecueDeFrise | undefined;
}

export type PeriodeActivite = NonNullable<ActiviteAnomalie['periode']>;
export type CategorieDeBarre = PeriodeActivite['categorie'];
