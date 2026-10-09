import { ActiviteEchue, DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { EchelleFrise, Graduation } from './EchelleFrise';
import { PlacementDeLInstant, PoigneeDeFrise } from './PoigneeDeFrise';

export type VueDeFrise = Pick<DossierAnomalie, 'journal' | 'activite' | 'borneDeFin'>;

export interface EntreesDeFrise {
  readonly vue: VueDeFrise;
  readonly maintenant: Date;
  readonly poignee: PoigneeDeFrise | undefined;
  readonly placement: PlacementDeLInstant | undefined;
  readonly largeur: number;
}

export type FinDeBarre = 'AUTOMATIQUE' | 'PROPOSEE';

export interface BarreFrise {
  readonly kind: 'BARRE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly largeur: number;
  readonly activite: string;
  readonly texte: string;
  readonly nom: string;
  readonly categorie: ActiviteEchue['categorie'];
  readonly fin: FinDeBarre;
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
}

export interface ClotureFrise {
  readonly kind: 'CLOTURE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly nom: string;
  readonly heure: string;
}

export type RepereASituer = Omit<RepereFrise, 'gauche' | 'haut'>;

export type ElementFrise = BarreFrise | RepereFrise | ClotureFrise | PositionDePoignee;

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
}

export interface PositionAvecHeure extends EmplacementDePoignee {
  readonly heure: 'AVEC_HEURE';
  readonly lecture: LectureDePoignee;
  readonly source: PoigneeDeFrise;
}

export interface PositionSansHeure extends EmplacementDePoignee {
  readonly heure: 'SANS_HEURE';
}

export type PositionDePoignee = PositionAvecHeure | PositionSansHeure;

export interface RangeeDePlacement {
  readonly haut: number;
  readonly hauteur: number;
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
