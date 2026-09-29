import { CategorieDActivite } from '../../../domain/element/CategorieDActivite';
import { ElementDuReleve } from '../../../domain/element/ElementDuReleve';
import { IntervalleDActivite } from '../../../domain/element/IntervalleDActivite';
import { PosteDeLElement } from '../../../domain/element/PosteDeLElement';
import { PosteReleveId } from '../../../domain/element/PosteReleveId';
import { PointageDElement } from '../../../domain/releve/PointageDElement';
import { TypeDePointageDElement } from '../../../domain/releve/TypeDePointage';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import { minutesDeDebut, minutesDeFin } from './AxeDuJour';
import { JourSurSonAxe } from './JourSurSonAxe';

const LIBELLES = LIBELLES_RELEVE_DES_HEURES;

export type StyleDeBarreDActivite = 'travail' | 'nc' | 'ouverte';

export interface BarreDActivite {
  readonly style: StyleDeBarreDActivite;
  readonly gauche: number;
  readonly largeur: number | undefined;
  readonly enonce: string;
  readonly presumee: boolean;
}

export type TypeDeMarque = 'debut' | 'nc' | 'fin' | 'clos';

export interface MarqueDePointage {
  readonly type: TypeDeMarque;
  readonly gauche: number;
  readonly titre: string;
  readonly choisie: boolean;
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
  readonly presume: string | undefined;
}

type Selection = (poste: PosteReleveId | undefined) => boolean;

const STYLES_D_ACTIVITE: Record<CategorieDActivite, StyleDeBarreDActivite> = { TRAVAIL: 'travail', NON_CONFORMITE: 'nc' };

const MARQUES: Record<TypeDePointageDElement, TypeDeMarque> = { DEBUT: 'debut', NON_CONFORMITE: 'nc', FIN: 'fin' };

const barreDActivite = (element: ElementDuReleve, { jour, axe }: JourSurSonAxe, intervalle: IntervalleDActivite): BarreDActivite => {
  const gauche = axe.pourcentDe(minutesDeDebut(intervalle.debut));
  if (intervalle.estEnCours()) {
    const enonce = LIBELLES.enonceDActiviteEnCours({
      element,
      jour: jour.jour,
      categorie: intervalle.categorie,
      debut: intervalle.debut,
    });
    return { style: 'ouverte', gauche, largeur: undefined, enonce, presumee: false };
  }
  const fin = intervalle.finOuDebut();
  const enonce = LIBELLES.enonceDActivite({
    element,
    jour: jour.jour,
    categorie: intervalle.categorie,
    debut: intervalle.debut,
    fin,
    presumee: intervalle.presumee,
    arreteSansFinPointee: jour.estArreteSansFinPointee(intervalle),
  });
  return {
    style: STYLES_D_ACTIVITE[intervalle.categorie],
    gauche,
    largeur: axe.pourcentDe(minutesDeFin(intervalle.debut, fin)) - gauche,
    enonce,
    presumee: intervalle.presumee,
  };
};

const marqueDe = ({ axe, pointageChoisi }: JourSurSonAxe, pointage: PointageDElement): MarqueDePointage => ({
  type: MARQUES[pointage.type],
  gauche: axe.pourcentDe(minutesDeDebut(pointage.instant)),
  titre: LIBELLES.pointage(pointage.type, pointage.instant),
  choisie: pointage === pointageChoisi,
});

const marquesDeCloture = (
  element: ElementDuReleve,
  { jour, axe, pointageChoisi }: JourSurSonAxe,
  retient: Selection,
): readonly MarqueDePointage[] =>
  jour.pointagesDePresence().flatMap(depart =>
    jour
      .effetDe(depart)
      .clotures.filter(cible => cible.element.estLeMeme(element.id) && retient(cible.poste))
      .map(() => ({
        type: 'clos' as const,
        gauche: axe.pourcentDe(minutesDeDebut(depart.instant)),
        titre: LIBELLES.clotureParLeDepart(depart.instant),
        choisie: depart === pointageChoisi,
      })),
  );

const marquesDe = (element: ElementDuReleve, jourSurAxe: JourSurSonAxe, retient: Selection): readonly MarqueDePointage[] =>
  jourSurAxe.ouvert
    ? [
        ...jourSurAxe.jour
          .pointagesDe(element.id)
          .filter(pointage => retient(pointage.cible.poste))
          .map(pointage => marqueDe(jourSurAxe, pointage)),
        ...marquesDeCloture(element, jourSurAxe, retient),
      ]
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
  cellules: cellulesDe(element, jours, cible => cible !== undefined && poste.id.estLeMeme(cible)),
});

const sousLigneSansPoste = (element: ElementDuReleve, jours: readonly JourSurSonAxe[]): readonly SousLigneDeFrise[] => {
  const cellules = cellulesDe(element, jours, cible => cible === undefined);
  return cellules.some(cellule => cellule.barres.length + cellule.marques.length > 0)
    ? [{ cle: 'sans-poste', poste: LIBELLES.sansPoste, cellules }]
    : [];
};

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
  presume: element.dureePresumee.estNulle() ? undefined : LIBELLES.presumees(element.dureePresumee),
});
