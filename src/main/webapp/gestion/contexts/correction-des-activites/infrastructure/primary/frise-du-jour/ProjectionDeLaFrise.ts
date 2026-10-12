import {
  AncrageDuRepere,
  AxeDuJour,
  minutesDeDebut,
  minutesDeFin,
} from '@/gestion/shared/design-system/infrastructure/primary/axe-du-jour/AxeDuJour';
import { ActiviteDeLaJournee } from '../../../domain/journee/ActiviteDeLaJournee';
import { BornesDuJour } from '../../../domain/journee/BornesDuJour';
import { CategorieDActivite } from '../../../domain/journee/CategorieDActivite';
import { InstantDeLaJournee } from '../../../domain/journee/InstantDeLaJournee';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';

const LIBELLES = LIBELLES_CORRECTION_DES_ACTIVITES;

export type StyleDeBarre = 'travail' | 'nc' | 'en-cours';

export interface BarreDeFrise {
  readonly style: StyleDeBarre;
  readonly gauche: number;
  readonly largeur: number | undefined;
  readonly enonce: string;
  readonly automatique: boolean;
  readonly coupeeAuDebut: boolean;
  readonly coupeeALaFin: boolean;
}

export type CoteDeMention = 'debut' | 'fin';

export interface MentionDeFrise {
  readonly cote: CoteDeMention;
  readonly texte: string;
}

export type TypeDeMarque = 'debut' | 'fin';

export interface MarqueDeFrise {
  readonly type: TypeDeMarque;
  readonly gauche: number;
  readonly titre: string;
}

export interface LigneDeFrise {
  readonly cle: string;
  readonly element: string;
  readonly poste: string;
  readonly barres: readonly BarreDeFrise[];
  readonly marques: readonly MarqueDeFrise[];
  readonly mentions: readonly MentionDeFrise[];
}

export interface RepereDeFrise {
  readonly minutes: number;
  readonly libelle: string;
  readonly gauche: number;
  readonly ancrage: AncrageDuRepere;
}

export interface FriseProjetee {
  readonly reperes: readonly RepereDeFrise[];
  readonly lignes: readonly LigneDeFrise[];
  readonly operationnel: string;
}

interface Portion {
  readonly activite: ActiviteDeLaJournee;
  readonly debut: number;
  readonly fin: number;
  readonly debutAvant: InstantDeLaJournee | undefined;
  readonly finApres: InstantDeLaJournee | undefined;
}

const STYLES_DE_BARRE: Record<CategorieDActivite, StyleDeBarre> = { TRAVAIL: 'travail', NON_CONFORMITE: 'nc' };

const portionDe = (activite: ActiviteDeLaJournee, bornes: BornesDuJour): Portion => {
  const debut = activite.debutSurLeJour(bornes).value;
  const fin = activite.finSurLeJour(bornes)?.value ?? debut;
  return {
    activite,
    debut: minutesDeDebut(debut),
    fin: minutesDeFin(debut, fin),
    debutAvant: activite.debutAvantLeJour(bornes),
    finApres: activite.finApresLeJour(bornes),
  };
};

const cleDeLigne = (activite: ActiviteDeLaJournee): string => `${activite.element.id.value}|${activite.poste?.id.value ?? ''}`;

const chronologique = (une: Portion, autre: Portion): number => (une.activite.debut.estAvant(autre.activite.debut) ? -1 : 1);

interface Groupe {
  readonly premiere: Portion;
  readonly portions: Portion[];
}

const parLigne = (portions: readonly Portion[]): readonly Groupe[] => {
  const groupes = new Map<string, Groupe>();
  portions.forEach(portion => {
    const groupe = groupes.get(cleDeLigne(portion.activite));
    if (groupe === undefined) {
      groupes.set(cleDeLigne(portion.activite), { premiere: portion, portions: [portion] });
    } else {
      groupe.portions.push(portion);
    }
  });
  return [...groupes.values()];
};

const enCours = (activite: ActiviteDeLaJournee): boolean => activite.etat.kind === 'EN_COURS';

const styleDe = (activite: ActiviteDeLaJournee): StyleDeBarre => (enCours(activite) ? 'en-cours' : STYLES_DE_BARRE[activite.categorie]);

const barreDe = (portion: Portion, axe: AxeDuJour, bornes: BornesDuJour): BarreDeFrise => {
  const gauche = axe.pourcentDe(portion.debut);
  return {
    style: styleDe(portion.activite),
    gauche,
    largeur: enCours(portion.activite) ? undefined : axe.pourcentDe(portion.fin) - gauche,
    enonce: LIBELLES.frise.barre(portion.activite, bornes),
    automatique: portion.activite.etat.kind === 'TERMINEE_AUTOMATIQUEMENT',
    coupeeAuDebut: portion.debutAvant !== undefined,
    coupeeALaFin: portion.finApres !== undefined,
  };
};

const finPointee = (activite: ActiviteDeLaJournee): InstantDeLaJournee | undefined =>
  activite.etat.kind === 'TERMINEE' ? activite.etat.fin : undefined;

const marqueDeDebut = (portion: Portion, axe: AxeDuJour): readonly MarqueDeFrise[] =>
  enCours(portion.activite) || portion.debutAvant !== undefined
    ? []
    : [{ type: 'debut', gauche: axe.pourcentDe(portion.debut), titre: LIBELLES.frise.debutPointe(portion.activite.debut) }];

const marqueDeFin = (portion: Portion, axe: AxeDuJour): readonly MarqueDeFrise[] => {
  const fin = finPointee(portion.activite);
  return fin === undefined || portion.finApres !== undefined
    ? []
    : [{ type: 'fin', gauche: axe.pourcentDe(portion.fin), titre: LIBELLES.frise.finPointee(fin) }];
};

const marquesDe = (portion: Portion, axe: AxeDuJour): readonly MarqueDeFrise[] => [
  ...marqueDeDebut(portion, axe),
  ...marqueDeFin(portion, axe),
];

const mentionDeDebut = (portion: Portion): readonly MentionDeFrise[] => {
  if (portion.debutAvant === undefined) {
    return [];
  }
  const texte = enCours(portion.activite)
    ? LIBELLES.frise.enCoursDepuis(portion.debutAvant)
    : LIBELLES.frise.debutAvant(portion.debutAvant);
  return [{ cote: 'debut', texte }];
};

const mentionDeFin = (portion: Portion): readonly MentionDeFrise[] =>
  portion.finApres === undefined ? [] : [{ cote: 'fin', texte: LIBELLES.frise.suite(portion.finApres) }];

const mentionsDe = (portion: Portion): readonly MentionDeFrise[] => [...mentionDeDebut(portion), ...mentionDeFin(portion)];

const ligneDe = ({ premiere, portions }: Groupe, axe: AxeDuJour, bornes: BornesDuJour): LigneDeFrise => ({
  cle: cleDeLigne(premiere.activite),
  element: LIBELLES.nomDeLElement(premiere.activite.element),
  poste: LIBELLES.posteDe(premiere.activite),
  barres: portions.map(portion => barreDe(portion, axe, bornes)),
  marques: portions.flatMap(portion => marquesDe(portion, axe)),
  mentions: portions.flatMap(mentionsDe),
});

export const friseDuJour = (journee: JourneeACorriger): FriseProjetee => {
  const portions = journee.activites.map(activite => portionDe(activite, journee.bornes)).sort(chronologique);
  const axe = AxeDuJour.de(portions.flatMap(portion => [portion.debut, portion.fin]));
  return {
    reperes: axe.reperes(true).map(repere => ({ ...repere, libelle: LIBELLES.frise.repere(repere.minutes) })),
    lignes: parLigne(portions).map(groupe => ligneDe(groupe, axe, journee.bornes)),
    operationnel: LIBELLES.duree(journee.dureeOperationnelle),
  };
};
