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

export interface DetailDuJour {
  readonly jour: JourDeFrise;
  readonly lignes: readonly LigneDeFrise[];
}

export interface AlerteDeFrise {
  readonly jour: string;
  readonly jourLibelle: string;
  readonly element: string;
  readonly etat: string | undefined;
}

export interface FriseDeLaSemaine {
  readonly detail: DetailDuJour | undefined;
  readonly alertes: readonly AlerteDeFrise[];
  readonly conflits: readonly ConflitDeFrise[];
  readonly journal: JournalDuJour | undefined;
  readonly colonnes: string;
  readonly calque: CalqueDeFrise | undefined;
  readonly jours: readonly JourDeFrise[];
  readonly lignes: readonly LigneDeFrise[];
  readonly operationnelTotal: string;
}

const reperesDetail = (axe: AxeDuJour): readonly RepereDeFrise[] =>
  axe.reperes(true).map(repere => ({ ...repere, libelle: LIBELLES.repere(repere.minutes) }));

const sansOperationnel = (jour: JourDeReleve): boolean => jour.estVide() && jour.operationnelTotal.snapshot().complete;

const jourDeFrise = ({ jour, axe, ouvert }: JourSurSonAxe, aujourdhui: JourCalendaire): JourDeFrise => ({
  cle: jour.jour.value,
  reperes: axe.reperes(false).map(repere => ({ ...repere, libelle: LIBELLES.repere(repere.minutes) })),
  libelle: LIBELLES.jour(jour.jour),
  aujourdhui: jour.jour.estLeMeme(aujourdhui),
  ouvert,
  operationnel: sansOperationnel(jour) ? LIBELLES.sansValeur : LIBELLES.duree(jour.operationnelTotal),
  sansOperationnel: sansOperationnel(jour),
});

const PREMIERE_COLONNE_DE_JOUR = 2;

const colonnesDe = (jours: readonly JourSurSonAxe[]): string =>
  ['var(--largeur-etiquette)', ...jours.map(() => 'var(--largeur-jour)'), 'var(--largeur-total)'].join(' ');

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

const alertesDeLigne = (ligne: LigneDeFrise, jour: JourSurSonAxe, rang: number): readonly AlerteDeFrise[] =>
  [...ligne.cellules.slice(rang, rang + 1), ...ligne.sousLignes.flatMap(sousLigne => sousLigne.cellules.slice(rang, rang + 1))].flatMap(
    cellule =>
      cellule.barres
        .filter(barre => barre.automatique || barre.style === 'a-resoudre')
        .map(barre => ({
          jour: jour.jour.jour.value,
          jourLibelle: LIBELLES.jour(jour.jour.jour),
          element: `${ligne.type} ${ligne.numero}`,
          etat: barre.etat,
        })),
  );

export const friseDeLaSemaine = (
  releve: ReleveDesHeures,
  aujourdhui: JourCalendaire,
  ouvert: JourCalendaire | undefined,
  selection: number | undefined,
): FriseDeLaSemaine => {
  const jours = releve.jours.map(jour => jourSurSonAxe(jour, ouvert, selection, AxeDuJour.entier()));
  const lignes = releve.elements.map(element => ligneDeFrise(element, jours, releve.travailleEnParallele(element)));
  const jourDetail = jours.find(jour => jour.ouvert);
  const axeDetail = jourDetail === undefined ? undefined : jourSurSonAxe(jourDetail.jour, ouvert, selection);
  const detail =
    axeDetail === undefined
      ? undefined
      : {
          jour: { ...jourDeFrise(axeDetail, aujourdhui), reperes: reperesDetail(axeDetail.axe) },
          lignes: releve.elements
            .map(element => ligneDeFrise(element, [axeDetail], releve.travailleEnParallele(element)))
            .filter(ligne =>
              [...ligne.cellules, ...ligne.sousLignes.flatMap(sousLigne => sousLigne.cellules)].some(
                cellule => cellule.barres.length + cellule.marques.length > 0,
              ),
            ),
        };
  const alertes = jours.flatMap((jour, rang) => lignes.flatMap(ligne => alertesDeLigne(ligne, jour, rang)));
  return {
    detail,
    alertes,
    conflits: releve.conflits.map(conflit => conflitDeFrise(releve, conflit)),
    journal: journalDuJourOuvert(releve, jours, selection),
    colonnes: colonnesDe(jours),
    calque: calqueDe(jours),
    jours: jours.map(jour => jourDeFrise(jour, aujourdhui)),
    lignes,
    operationnelTotal: LIBELLES.duree(releve.operationnelTotal),
  };
};
