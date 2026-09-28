import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import { AncrageDuRepere, AxeDuJour, minutesDeDebut, minutesDeFin, seLePoursuit } from './AxeDuJour';
import { JourSurSonAxe, jourSurSonAxe } from './JourSurSonAxe';
import { JournalDuJour, journalDuJour } from './JournalDuJour';
import { LigneDeFrise, ligneDeFrise } from './LignesDElements';

const LIBELLES = LIBELLES_RELEVE_DES_HEURES;

export type NatureDeBarre = 'plage' | 'presumee' | 'ouverte';

export interface BarreDeFrise {
  readonly nature: NatureDeBarre;
  readonly gauche: number;
  readonly largeur: number | undefined;
  readonly enonce: string;
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
  readonly ouvert: boolean;
  readonly presence: readonly BarreDeFrise[];
  readonly operationnel: string;
  readonly operationnelPresume: string | undefined;
}

export interface TraitDePresence {
  readonly gauche: number;
  readonly titre: string;
}

export interface CalqueDeFrise {
  readonly colonne: number;
  readonly traits: readonly TraitDePresence[];
  readonly repere: TraitDePresence | undefined;
}

export interface FriseDeLaSemaine {
  readonly journal: JournalDuJour | undefined;
  readonly colonnes: string;
  readonly calque: CalqueDeFrise | undefined;
  readonly jours: readonly JourDeFrise[];
  readonly lignes: readonly LigneDeFrise[];
  readonly operationnelTotal: string;
  readonly operationnelTotalPresume: string | undefined;
  readonly presenceTotal: string;
  readonly presenceTotalPresume: string | undefined;
}

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

const reperesDuJour = (jour: JourDeReleve, axe: AxeDuJour, ouvert: boolean): readonly RepereDeFrise[] =>
  jour.estVide() && !ouvert ? [] : axe.reperes(ouvert).map(repere => ({ ...repere, libelle: LIBELLES.repere(repere.minutes) }));

const jourDeFrise = ({ jour, axe, ouvert }: JourSurSonAxe, aujourdhui: JourCalendaire): JourDeFrise => ({
  cle: jour.jour.value,
  reperes: reperesDuJour(jour, axe, ouvert),
  libelle: LIBELLES.jour(jour.jour),
  aujourdhui: jour.jour.estLeMeme(aujourdhui),
  ouvert,
  presence: jour.plages.map(plage => barreDePresence(jour, axe, plage)),
  operationnel: jour.estVide() ? LIBELLES.sansValeur : LIBELLES.duree(jour.operationnelPointe),
  operationnelPresume: jour.operationnelPresume.estNulle() ? undefined : LIBELLES.presumees(jour.operationnelPresume),
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

const repereDe = ({ axe, pointageChoisi }: JourSurSonAxe): TraitDePresence | undefined =>
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
        traits: ouvert.jour.pointagesDePresence().map(pointage => ({
          gauche: ouvert.axe.pourcentDe(minutesDeDebut(pointage.instant)),
          titre: LIBELLES.pointage(pointage.type, pointage.instant),
        })),
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

export const friseDeLaSemaine = (
  releve: ReleveDesHeures,
  aujourdhui: JourCalendaire,
  ouvert: JourCalendaire | undefined,
  selection: number | undefined,
): FriseDeLaSemaine => {
  const jours = releve.jours.map(jour => jourSurSonAxe(jour, ouvert, selection));
  return {
    journal: journalDuJourOuvert(releve, jours, selection),
    colonnes: colonnesDe(jours),
    calque: calqueDe(jours),
    jours: jours.map(jour => jourDeFrise(jour, aujourdhui)),
    lignes: releve.elements.map(element => ligneDeFrise(element, jours, releve.travailleEnParallele(element))),
    operationnelTotal: LIBELLES.duree(releve.operationnelPointe),
    operationnelTotalPresume: releve.operationnelPresume.estNulle() ? undefined : LIBELLES.presume(releve.operationnelPresume),
    presenceTotal: LIBELLES.duree(releve.presencePointee),
    presenceTotalPresume: releve.presencePresumee.estNulle() ? undefined : LIBELLES.presume(releve.presencePresumee),
  };
};
