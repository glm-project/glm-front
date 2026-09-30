import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { SequenceEnConflit } from '../../../domain/releve/SequenceEnConflit';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { JournalDuJour, journalDuJour } from '../journal-du-jour/JournalDuJour';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import { AncrageDuRepere, AxeDuJour, minutesDeDebut } from './AxeDuJour';
import { JourSurSonAxe, jourSurSonAxe } from './JourSurSonAxe';
import { LigneDeFrise, ligneDeFrise } from './LignesDElements';

const LIBELLES = LIBELLES_RELEVE_DES_HEURES;

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
  readonly ouvert: boolean;
  readonly operationnel: string;
  readonly sansOperationnel: boolean;
}

export interface GuideDePointage {
  readonly gauche: number;
  readonly titre: string;
}

export interface CalqueDeFrise {
  readonly colonne: number;
  readonly repere: GuideDePointage | undefined;
}

export interface ConflitDeFrise {
  readonly element: string;
  readonly activites: string | undefined;
  readonly faits: readonly string[];
}

export interface FriseDeLaSemaine {
  readonly conflits: readonly ConflitDeFrise[];
  readonly journal: JournalDuJour | undefined;
  readonly colonnes: string;
  readonly calque: CalqueDeFrise | undefined;
  readonly jours: readonly JourDeFrise[];
  readonly lignes: readonly LigneDeFrise[];
  readonly operationnelTotal: string;
}

const reperesDuJour = (jour: JourDeReleve, axe: AxeDuJour, ouvert: boolean): readonly RepereDeFrise[] =>
  jour.estVide() && !ouvert ? [] : axe.reperes(ouvert).map(repere => ({ ...repere, libelle: LIBELLES.repere(repere.minutes) }));

const sansOperationnel = (jour: JourDeReleve): boolean => jour.estVide() && jour.operationnelTotal.snapshot().complete;

const jourDeFrise = ({ jour, axe, ouvert }: JourSurSonAxe, aujourdhui: JourCalendaire): JourDeFrise => ({
  cle: jour.jour.value,
  reperes: reperesDuJour(jour, axe, ouvert),
  libelle: LIBELLES.jour(jour.jour),
  aujourdhui: jour.jour.estLeMeme(aujourdhui),
  ouvert,
  operationnel: sansOperationnel(jour) ? LIBELLES.sansValeur : LIBELLES.duree(jour.operationnelTotal),
  sansOperationnel: sansOperationnel(jour),
});

const PREMIERE_COLONNE_DE_JOUR = 2;

const largeurDuJour = ({ jour, ouvert }: JourSurSonAxe): string => {
  if (ouvert) {
    return 'var(--largeur-ouverte)';
  }
  return jour.estVide() ? 'var(--largeur-vide)' : 'var(--largeur-fermee)';
};

const colonnesDe = (jours: readonly JourSurSonAxe[]): string =>
  ['var(--largeur-etiquette)', ...jours.map(largeurDuJour), 'var(--largeur-total)'].join(' ');

const repereDe = ({ axe, pointageChoisi }: JourSurSonAxe): GuideDePointage | undefined =>
  pointageChoisi === undefined
    ? undefined
    : {
        gauche: axe.pourcentDe(minutesDeDebut(pointageChoisi.instant)),
        titre: LIBELLES.pointage(pointageChoisi.type, pointageChoisi.instant),
      };

const calqueDe = (jours: readonly JourSurSonAxe[]): CalqueDeFrise | undefined => {
  const rang = jours.findIndex(jour => jour.ouvert);
  const ouvert = jours[rang];
  return ouvert === undefined
    ? undefined
    : {
        colonne: rang + PREMIERE_COLONNE_DE_JOUR,
        repere: repereDe(ouvert),
      };
};

const journalDuJourOuvert = (
  releve: ReleveDesHeures,
  jours: readonly JourSurSonAxe[],
  selection: number | undefined,
): JournalDuJour | undefined => {
  const ouvert = jours.find(jour => jour.ouvert);
  return ouvert === undefined ? undefined : journalDuJour(releve, ouvert.jour, selection);
};

const conflitDeFrise = (releve: ReleveDesHeures, conflit: SequenceEnConflit): ConflitDeFrise => {
  const element = releve.elementDe(conflit.cible.element);
  const poste = element.libelleDuPoste(conflit.cible.poste);
  const pointages = releve.jours.flatMap(jour => jour.pointages);
  return {
    element: poste === undefined ? LIBELLES.nomDElement(element) : `${LIBELLES.nomDElement(element)} · ${poste}`,
    activites: conflit.activites.length === 0 ? undefined : LIBELLES.activitesConcernees(conflit.activites.map(id => id.value)),
    faits: conflit.pointages.map(id => {
      const pointage = pointages.find(fait => fait.id.value === id.value);
      return pointage === undefined ? LIBELLES.pointageConcerne(id.value) : LIBELLES.faitConcerne(pointage);
    }),
  };
};

export const friseDeLaSemaine = (
  releve: ReleveDesHeures,
  aujourdhui: JourCalendaire,
  ouvert: JourCalendaire | undefined,
  selection: number | undefined,
): FriseDeLaSemaine => {
  const jours = releve.jours.map(jour => jourSurSonAxe(jour, ouvert, selection));
  return {
    conflits: releve.conflits.map(conflit => conflitDeFrise(releve, conflit)),
    journal: journalDuJourOuvert(releve, jours, selection),
    colonnes: colonnesDe(jours),
    calque: calqueDe(jours),
    jours: jours.map(jour => jourDeFrise(jour, aujourdhui)),
    lignes: releve.elements.map(element => ligneDeFrise(element, jours, releve.travailleEnParallele(element))),
    operationnelTotal: LIBELLES.duree(releve.operationnelTotal),
  };
};
