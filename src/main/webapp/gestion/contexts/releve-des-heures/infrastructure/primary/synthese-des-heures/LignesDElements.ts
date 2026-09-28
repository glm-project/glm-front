import { CategorieDActivite } from '../../../domain/element/CategorieDActivite';
import { ElementDuReleve } from '../../../domain/element/ElementDuReleve';
import { IntervalleDActivite } from '../../../domain/element/IntervalleDActivite';
import { PosteDeLElement } from '../../../domain/element/PosteDeLElement';
import { PosteReleveId } from '../../../domain/element/PosteReleveId';
import { PointageDElement } from '../../../domain/releve/PointageDElement';
import { TypeDePointageDElement } from '../../../domain/releve/TypeDePointage';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import { AxeDuJour, minutesDeDebut, minutesDeFin } from './AxeDuJour';
import { JourSurSonAxe } from './JourSurSonAxe';

const LIBELLES = LIBELLES_RELEVE_DES_HEURES;

export type NatureDActivite = 'travail' | 'nc' | 'ouverte';

export interface BarreDActivite {
  readonly nature: NatureDActivite;
  readonly gauche: number;
  readonly largeur: number | undefined;
  readonly enonce: string;
  readonly presumee: boolean;
}

export type TypeDeMarque = 'debut' | 'nc' | 'fin';

export interface MarqueDePointage {
  readonly type: TypeDeMarque;
  readonly gauche: number;
  readonly titre: string;
}

export interface CelluleDeLigne {
  readonly barres: readonly BarreDActivite[];
  readonly marques: readonly MarqueDePointage[];
}

export interface SousLigneDeFrise {
  readonly cle: string;
  readonly poste: string;
  readonly cellules: readonly CelluleDeLigne[];
}

export interface LigneDeFrise {
  readonly cle: string;
  readonly cellules: readonly CelluleDeLigne[];
  readonly sousLignes: readonly SousLigneDeFrise[];
  readonly type: string;
  readonly numero: string;
  readonly libelle: string;
  readonly postes: string;
  readonly total: string;
  readonly nonConformite: string | undefined;
}

type Selection = (poste: PosteReleveId | undefined) => boolean;

const NATURES_D_ACTIVITE: Record<CategorieDActivite, NatureDActivite> = { TRAVAIL: 'travail', NON_CONFORMITE: 'nc' };

const MARQUES: Record<TypeDePointageDElement, TypeDeMarque> = { DEBUT: 'debut', NON_CONFORMITE: 'nc', FIN: 'fin' };

const barreDActivite = (element: ElementDuReleve, { jour, axe }: JourSurSonAxe, intervalle: IntervalleDActivite): BarreDActivite => {
  const gauche = axe.pourcentDe(minutesDeDebut(intervalle.debut));
  if (intervalle.fin === undefined) {
    const enonce = LIBELLES.enonceDActiviteEnCours({
      element,
      jour: jour.jour,
      categorie: intervalle.categorie,
      debut: intervalle.debut,
    });
    return { nature: 'ouverte', gauche, largeur: undefined, enonce, presumee: false };
  }
  const enonce = LIBELLES.enonceDActivite({
    element,
    jour: jour.jour,
    categorie: intervalle.categorie,
    debut: intervalle.debut,
    fin: intervalle.fin,
    presumee: intervalle.presumee,
  });
  return {
    nature: NATURES_D_ACTIVITE[intervalle.categorie],
    gauche,
    largeur: axe.pourcentDe(minutesDeFin(intervalle.debut, intervalle.fin)) - gauche,
    enonce,
    presumee: intervalle.presumee,
  };
};

const marqueDe = (axe: AxeDuJour, pointage: PointageDElement): MarqueDePointage => ({
  type: MARQUES[pointage.type],
  gauche: axe.pourcentDe(minutesDeDebut(pointage.instant)),
  titre: LIBELLES.pointageDElement(pointage.type, pointage.instant),
});

const marquesDe = (element: ElementDuReleve, { jour, axe, ouvert }: JourSurSonAxe, retient: Selection): readonly MarqueDePointage[] =>
  ouvert
    ? jour
        .pointagesDe(element.id)
        .filter(pointage => retient(pointage.cible.poste))
        .map(pointage => marqueDe(axe, pointage))
    : [];

const cellulesDe = (element: ElementDuReleve, jours: readonly JourSurSonAxe[], retient: Selection): readonly CelluleDeLigne[] =>
  jours.map(jour => ({
    barres: jour.jour
      .intervallesDe(element.id)
      .filter(intervalle => retient(intervalle.poste))
      .map(intervalle => barreDActivite(element, jour, intervalle)),
    marques: marquesDe(element, jour, retient),
  }));

const sousLigneDuPoste = (element: ElementDuReleve, jours: readonly JourSurSonAxe[], poste: PosteDeLElement): SousLigneDeFrise => ({
  cle: poste.id.value,
  poste: poste.libelle,
  cellules: cellulesDe(element, jours, cible => cible?.value === poste.id.value),
});

const sousLigneSansPoste = (element: ElementDuReleve, jours: readonly JourSurSonAxe[]): readonly SousLigneDeFrise[] =>
  jours.some(jour => jour.jour.intervallesDe(element.id).some(intervalle => intervalle.poste === undefined))
    ? [{ cle: 'sans-poste', poste: LIBELLES.sansPoste, cellules: cellulesDe(element, jours, cible => cible === undefined) }]
    : [];

const postesDistincts = (element: ElementDuReleve): readonly PosteDeLElement[] =>
  element.postes.filter((poste, rang) => element.postes.findIndex(autre => autre.id.value === poste.id.value) === rang);

const sousLignesDe = (element: ElementDuReleve, jours: readonly JourSurSonAxe[]): readonly SousLigneDeFrise[] => [
  ...postesDistincts(element).map(poste => sousLigneDuPoste(element, jours, poste)),
  ...sousLigneSansPoste(element, jours),
];

export const ligneDeFrise = (element: ElementDuReleve, jours: readonly JourSurSonAxe[], enParallele: boolean): LigneDeFrise => ({
  cle: element.id.value,
  cellules: cellulesDe(element, jours, () => !enParallele),
  sousLignes: enParallele ? sousLignesDe(element, jours) : [],
  type: LIBELLES.typeDElement(element.type),
  numero: element.numero(),
  libelle: element.description ?? '',
  postes: LIBELLES.postes(element.postes),
  total: LIBELLES.duree(element.duree),
  nonConformite: element.dureeNonConformite.estNulle() ? undefined : LIBELLES.nonConformite(element.dureeNonConformite),
});
