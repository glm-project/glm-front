import { CategorieDActivite } from '../../../domain/element/CategorieDActivite';
import { ElementDuReleve } from '../../../domain/element/ElementDuReleve';
import { IntervalleDActivite } from '../../../domain/element/IntervalleDActivite';
import { PosteDeLElement } from '../../../domain/element/PosteDeLElement';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import { AncrageDuRepere, AxeDuJour, minutesDeDebut, minutesDeFin, seLePoursuit } from './AxeDuJour';

const LIBELLES = LIBELLES_RELEVE_DES_HEURES;

export type NatureDeBarre = 'plage' | 'presumee' | 'ouverte';

export interface BarreDeFrise {
  readonly nature: NatureDeBarre;
  readonly gauche: number;
  readonly largeur: number | undefined;
  readonly enonce: string;
}

export type NatureDActivite = 'travail' | 'nc' | 'ouverte';

export interface BarreDActivite {
  readonly nature: NatureDActivite;
  readonly gauche: number;
  readonly largeur: number | undefined;
  readonly enonce: string;
  readonly presumee: boolean;
}

export interface RepereDeFrise {
  readonly minutes: number;
  readonly libelle: string;
  readonly gauche: number;
  readonly ancrage: AncrageDuRepere;
}

export interface JourDeFrise {
  readonly cle: string;
  readonly reperes: readonly RepereDeFrise[];
  readonly libelle: string;
  readonly aujourdhui: boolean;
  readonly presence: readonly BarreDeFrise[];
  readonly operationnel: string;
  readonly operationnelPresume: string | undefined;
}

export interface SousLigneDeFrise {
  readonly cle: string;
  readonly poste: string;
  readonly cellules: readonly (readonly BarreDActivite[])[];
}

export interface LigneDeFrise {
  readonly cle: string;
  readonly cellules: readonly (readonly BarreDActivite[])[];
  readonly sousLignes: readonly SousLigneDeFrise[];
  readonly type: string;
  readonly numero: string;
  readonly libelle: string;
  readonly postes: string;
  readonly total: string;
  readonly nonConformite: string | undefined;
}

export interface FriseDeLaSemaine {
  readonly jours: readonly JourDeFrise[];
  readonly lignes: readonly LigneDeFrise[];
  readonly operationnelTotal: string;
  readonly operationnelTotalPresume: string | undefined;
  readonly presenceTotal: string;
  readonly presenceTotalPresume: string | undefined;
}

interface JourSurSonAxe {
  readonly jour: JourDeReleve;
  readonly axe: AxeDuJour;
}

const bornesDe = (debut: InstantDeReleve, fin: InstantDeReleve | undefined): readonly number[] =>
  fin === undefined ? [minutesDeDebut(debut)] : [minutesDeDebut(debut), minutesDeFin(debut, fin)];

const bornesDuJour = (jour: JourDeReleve): readonly number[] => [
  ...jour.plages.flatMap(plage => bornesDe(plage.debut, plage.fin)),
  ...jour.intervalles.flatMap(intervalle => bornesDe(intervalle.debut, intervalle.fin)),
];

const barreDePresence = (jour: JourDeReleve, axe: AxeDuJour, plage: PlageDeReleve): BarreDeFrise => {
  const gauche = axe.pourcentDe(minutesDeDebut(plage.debut));
  if (plage.fin === undefined) {
    return { nature: 'ouverte', gauche, largeur: undefined, enonce: LIBELLES.enonceDePlageEnCours(plage.debut) };
  }
  const enonce = LIBELLES.enonceDePlage({
    presumee: plage.presumee,
    debut: plage.debut,
    fin: plage.fin,
    depuisLaVeille: jour.vientDeLaVeille(plage),
    seLePoursuit: seLePoursuit(plage.debut, plage.fin),
  });
  const nature = plage.presumee ? 'presumee' : 'plage';
  return { nature, gauche, largeur: axe.pourcentDe(minutesDeFin(plage.debut, plage.fin)) - gauche, enonce };
};

const jourDeFrise = ({ jour, axe }: JourSurSonAxe, aujourdhui: JourCalendaire): JourDeFrise => ({
  cle: jour.jour.value,
  reperes: axe.reperes().map(repere => ({ ...repere, libelle: LIBELLES.repere(repere.minutes) })),
  libelle: LIBELLES.jour(jour.jour),
  aujourdhui: jour.jour.estLeMeme(aujourdhui),
  presence: jour.plages.map(plage => barreDePresence(jour, axe, plage)),
  operationnel: jour.estVide() ? LIBELLES.sansValeur : LIBELLES.duree(jour.operationnelPointe),
  operationnelPresume: jour.operationnelPresume.estNulle() ? undefined : LIBELLES.presumees(jour.operationnelPresume),
});

const NATURES_D_ACTIVITE: Record<CategorieDActivite, NatureDActivite> = { TRAVAIL: 'travail', NON_CONFORMITE: 'nc' };

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

type Selection = (intervalle: IntervalleDActivite) => boolean;

const cellulesDe = (
  element: ElementDuReleve,
  jours: readonly JourSurSonAxe[],
  retient: Selection,
): readonly (readonly BarreDActivite[])[] =>
  jours.map(jour =>
    jour.jour
      .intervallesDe(element.id)
      .filter(retient)
      .map(intervalle => barreDActivite(element, jour, intervalle)),
  );

const sousLigneDuPoste = (element: ElementDuReleve, jours: readonly JourSurSonAxe[], poste: PosteDeLElement): SousLigneDeFrise => ({
  cle: poste.id.value,
  poste: poste.libelle,
  cellules: cellulesDe(element, jours, intervalle => intervalle.poste?.value === poste.id.value),
});

const sousLigneSansPoste = (element: ElementDuReleve, jours: readonly JourSurSonAxe[]): readonly SousLigneDeFrise[] =>
  jours.some(jour => jour.jour.intervallesDe(element.id).some(intervalle => intervalle.poste === undefined))
    ? [{ cle: 'sans-poste', poste: LIBELLES.sansPoste, cellules: cellulesDe(element, jours, intervalle => intervalle.poste === undefined) }]
    : [];

const postesDistincts = (element: ElementDuReleve): readonly PosteDeLElement[] =>
  element.postes.filter((poste, rang) => element.postes.findIndex(autre => autre.id.value === poste.id.value) === rang);

const sousLignesDe = (element: ElementDuReleve, jours: readonly JourSurSonAxe[]): readonly SousLigneDeFrise[] => [
  ...postesDistincts(element).map(poste => sousLigneDuPoste(element, jours, poste)),
  ...sousLigneSansPoste(element, jours),
];

const ligneDeFrise = (element: ElementDuReleve, jours: readonly JourSurSonAxe[], enParallele: boolean): LigneDeFrise => ({
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

export const friseDeLaSemaine = (releve: ReleveDesHeures, aujourdhui: JourCalendaire): FriseDeLaSemaine => {
  const jours = releve.jours.map(jour => ({ jour, axe: AxeDuJour.de(bornesDuJour(jour)) }));
  return {
    jours: jours.map(jour => jourDeFrise(jour, aujourdhui)),
    lignes: releve.elements.map(element => ligneDeFrise(element, jours, releve.travailleEnParallele(element))),
    operationnelTotal: LIBELLES.duree(releve.operationnelPointe),
    operationnelTotalPresume: releve.operationnelPresume.estNulle() ? undefined : LIBELLES.presume(releve.operationnelPresume),
    presenceTotal: LIBELLES.duree(releve.presencePointee),
    presenceTotalPresume: releve.presencePresumee.estNulle() ? undefined : LIBELLES.presume(releve.presencePresumee),
  };
};
