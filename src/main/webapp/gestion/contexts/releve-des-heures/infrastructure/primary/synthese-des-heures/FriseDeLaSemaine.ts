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

export interface FriseDeLaSemaine {
  readonly jours: readonly JourDeFrise[];
  readonly operationnelTotal: string;
  readonly operationnelTotalPresume: string | undefined;
  readonly presenceTotal: string;
  readonly presenceTotalPresume: string | undefined;
}

const bornesDeLaPlage = (plage: PlageDeReleve): readonly number[] =>
  plage.fin === undefined ? [minutesDeDebut(plage.debut)] : [minutesDeDebut(plage.debut), minutesDeFin(plage.debut, plage.fin)];

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

const jourDeFrise = (jour: JourDeReleve, aujourdhui: JourCalendaire): JourDeFrise => {
  const axe = AxeDuJour.de(jour.plages.flatMap(bornesDeLaPlage));
  return {
    cle: jour.jour.value,
    reperes: axe.reperes().map(repere => ({ ...repere, libelle: LIBELLES.repere(repere.minutes) })),
    libelle: LIBELLES.jour(jour.jour),
    aujourdhui: jour.jour.estLeMeme(aujourdhui),
    presence: jour.plages.map(plage => barreDePresence(jour, axe, plage)),
    operationnel: jour.estVide() ? LIBELLES.sansValeur : LIBELLES.duree(jour.operationnelPointe),
    operationnelPresume: jour.operationnelPresume.estNulle() ? undefined : LIBELLES.presumees(jour.operationnelPresume),
  };
};

export const friseDeLaSemaine = (releve: ReleveDesHeures, aujourdhui: JourCalendaire): FriseDeLaSemaine => ({
  jours: releve.jours.map(jour => jourDeFrise(jour, aujourdhui)),
  operationnelTotal: LIBELLES.duree(releve.operationnelPointe),
  operationnelTotalPresume: releve.operationnelPresume.estNulle() ? undefined : LIBELLES.presume(releve.operationnelPresume),
  presenceTotal: LIBELLES.duree(releve.presencePointee),
  presenceTotalPresume: releve.presencePresumee.estNulle() ? undefined : LIBELLES.presume(releve.presencePresumee),
});
