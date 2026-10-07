import { ActiviteAnomalie, DiagnosticConflit, DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { SelectionDuDossier } from '../SelectionDuDossier';
import { EchelleFrise, Graduation, graduationsDe, surVoies } from './EchelleFrise';
import {
  abscisseEnPixelsDuRepere,
  barreDe,
  dispositionApres,
  ESPACE_ENTRE_RANGEES_PX,
  HAUTEUR_D_UN_ELEMENT_PX,
  HAUTEUR_DE_L_AXE_PX,
  hauteurDeLaFrise,
  hauteurDesReperes,
  lectureDeLaFrise,
  parDebut,
  positionDeLaPoignee,
  repereDe,
} from './ElementsDeFrise';
import { dispositionEnLigne, seLitEnLigne } from './FriseEnLigne';
import { PlacementDeLInstant, PoigneeDeFrise } from './PoigneeDeFrise';

const HAUTEUR_DE_L_INTITULE_PX = 20;

export type VueDeFrise = Pick<DossierAnomalie, 'journal' | 'perimetre' | 'activites' | 'diagnostics' | 'enConflit'> & {
  readonly choix?: DossierAnomalie['choix'];
};

export interface ApercuDeFrise {
  readonly avant: VueDeFrise;
  readonly apres: VueDeFrise;
}

export interface EntreesDeFrise {
  readonly vue: VueDeFrise;
  readonly maintenant: Date;
  readonly poignee: PoigneeDeFrise | undefined;
  readonly placement: PlacementDeLInstant | undefined;
  readonly apercu: ApercuDeFrise | undefined;
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
  readonly selection: SelectionDuDossier;
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
  readonly voie: number;
  readonly pointage: string;
  readonly nom: string;
  readonly selection: SelectionDuDossier;
  readonly heure: string;
  readonly symbole: string;
  readonly nonConformite: boolean;
  readonly annule: boolean;
  readonly regularise: boolean;
  readonly enCause: boolean;
  readonly deplace: boolean;
  readonly tardif: boolean;
  readonly faitDeLActe: boolean;
  readonly ancrage: 'CENTRE' | 'GAUCHE' | 'DROITE';
}

export type ElementFrise = BarreFrise | RepereFrise | PositionDePoignee;

export interface FlecheFrise {
  readonly cle: string;
  readonly pointage: string;
  readonly activite: string;
  readonly departGauche: number;
  readonly departHaut: number;
  readonly arriveeGauche: number;
  readonly arriveeHaut: number;
}

export interface LectureDePoignee {
  readonly valeur: number;
  readonly texte: string;
}

export interface PositionDePoignee {
  readonly kind: 'POIGNEE';
  readonly cle: string;
  readonly instant: number;
  readonly gauche: number;
  readonly haut: number;
  readonly min: number;
  readonly max: number;
  readonly etiquette: string;
  readonly lecture: LectureDePoignee | undefined;
  readonly sansHeure: boolean;
  readonly desactivee: boolean;
  readonly source: PoigneeDeFrise | PlacementDeLInstant;
}

export interface RangeeDePlacement {
  readonly haut: number;
  readonly hauteur: number;
  readonly desactivee: boolean;
  readonly source: PlacementDeLInstant;
  readonly surLaBarreDe: string | undefined;
}

export interface IntituleDeRangee {
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
  readonly enLigne: boolean;
  readonly echelle: EchelleFrise;
  readonly hauteur: number;
  readonly graduations: readonly Graduation[];
  readonly intituleDesPointages: IntituleDeRangee | undefined;
  readonly fleches: readonly FlecheFrise[];
  readonly elements: readonly ElementFrise[];
  readonly rangeeDePlacement: RangeeDePlacement | undefined;
  readonly retrait: RetraitDeFrise | undefined;
  readonly finRecue: FinRecueDeFrise | undefined;
  readonly apres: DispositionApres | undefined;
}

export type BarreApres = BarreFrise & { readonly modifiee: boolean };

export interface DispositionApres {
  readonly haut: number;
  readonly hauteur: number;
  readonly reperes: readonly RepereFrise[];
  readonly barres: readonly BarreApres[];
}

export type PeriodeActivite = NonNullable<ActiviteAnomalie['periode']>;
export type CategorieDeBarre = PeriodeActivite['categorie'];

const flechesDe = (
  diagnostics: readonly DiagnosticConflit[],
  reperes: readonly RepereFrise[],
  barres: readonly BarreFrise[],
): readonly FlecheFrise[] =>
  diagnostics.flatMap(diagnostic => {
    const repere = reperes.find(candidat => candidat.pointage === diagnostic.pointage.pointage);
    const barre = barres.find(candidate => candidate.activite === diagnostic.cible.activite.activite && candidate.categorie !== undefined);
    return repere === undefined || barre === undefined
      ? []
      : [
          {
            cle: `${repere.cle}>${barre.cle}`,
            pointage: repere.pointage,
            activite: barre.activite,
            departGauche: repere.gauche,
            departHaut: repere.haut + HAUTEUR_D_UN_ELEMENT_PX,
            arriveeGauche: barre.gauche,
            arriveeHaut: barre.haut,
          },
        ];
  });

const intituleDesPointages = (pointages: readonly PointageAnomalie[]): IntituleDeRangee | undefined =>
  pointages.length === 0 ? undefined : { haut: HAUTEUR_DE_L_AXE_PX, hauteur: HAUTEUR_DE_L_INTITULE_PX };

const hautDesReperesSous = (intitule: IntituleDeRangee | undefined): number => HAUTEUR_DE_L_AXE_PX + (intitule?.hauteur ?? 0);

const rangeeDePlacement = (placement: PlacementDeLInstant, reperes: readonly RepereFrise[], hautDesReperes: number): RangeeDePlacement => ({
  haut: hautDesReperes,
  hauteur: hauteurDesReperes(reperes),
  desactivee: placement.desactivee,
  source: placement,
  surLaBarreDe: undefined,
});

const dispositionEnRangees = (entrees: EntreesDeFrise): DispositionFrise => {
  const { vue, maintenant: now, poignee, placement, apercu, largeur } = entrees;
  const { enCause, pointages, pointagesApres, echelle, tardifs } = lectureDeLaFrise(entrees);
  const intitule = intituleDesPointages(pointages);
  const hautDesReperes = hautDesReperesSous(intitule);
  const contexte = { now, echelle, poignee, tardifs, faitsDeLActe: new Set<string>(), hautDesReperes, largeur };
  const reperes = surVoies(pointages, pointage => abscisseEnPixelsDuRepere(pointage, contexte)).map(({ element, voie }) =>
    repereDe(element, enCause.has(element.id.pointage), voie, contexte),
  );
  const hautDeLaPoignee = hautDesReperes + hauteurDesReperes(reperes);
  const hautDesActivites = hautDeLaPoignee + (poignee === undefined ? 0 : HAUTEUR_D_UN_ELEMENT_PX) + ESPACE_ENTRE_RANGEES_PX;
  const barres = parDebut(vue.activites).map((activite, rang) =>
    barreDe(activite, hautDesActivites + rang * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX), contexte),
  );
  const positionDePoignee = poignee === undefined ? [] : [positionDeLaPoignee(poignee, echelle, hautDeLaPoignee, largeur)];
  const elements = [...barres, ...reperes, ...positionDePoignee].sort((gauche, droite) => gauche.instant - droite.instant);
  const apres =
    apercu === undefined
      ? undefined
      : dispositionApres(
          apercu,
          pointagesApres,
          hautDesActivites + barres.length * (HAUTEUR_D_UN_ELEMENT_PX + ESPACE_ENTRE_RANGEES_PX),
          contexte,
        );
  return {
    enLigne: false,
    echelle,
    hauteur: hauteurDeLaFrise(elements, poignee === undefined ? undefined : hautDeLaPoignee, apres),
    graduations: graduationsDe(echelle, largeur),
    intituleDesPointages: intitule,
    fleches: flechesDe(vue.diagnostics ?? [], reperes, barres),
    elements,
    rangeeDePlacement: placement === undefined ? undefined : rangeeDePlacement(placement, reperes, hautDesReperes),
    retrait: undefined,
    finRecue: undefined,
    apres,
  };
};

export const dispositionDeFrise = (entrees: EntreesDeFrise): DispositionFrise =>
  seLitEnLigne(entrees.vue) ? dispositionEnLigne(entrees) : dispositionEnRangees(entrees);
