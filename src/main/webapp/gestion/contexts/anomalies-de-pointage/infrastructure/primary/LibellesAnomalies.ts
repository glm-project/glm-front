import { TypePointage } from '../../domain/dossier/DossierAnomalie';
import { CodeRefusRegularisation } from '../../domain/regularisation/RegularisationPort';

export interface ActiviteDansUnePhrase {
  readonly defini: string;
  readonly accord: string;
}

const GESTES: Readonly<Record<TypePointage, string>> = {
  DEBUT: 'Démarrage',
  NON_CONFORMITE: 'Démarrage en NC',
  FIN: 'Arrêt',
};

const SYMBOLES_DES_GESTES: Readonly<Record<TypePointage, string>> = {
  DEBUT: '▶',
  NON_CONFORMITE: '▷',
  FIN: '■',
};

const ACTIVITES_DE_PHRASE = {
  TRAVAIL: { defini: 'le travail', accord: '' },
  NON_CONFORMITE: { defini: 'la non-conformité', accord: 'e' },
} as const satisfies Readonly<Record<string, ActiviteDansUnePhrase>>;

type Activite = ActiviteDansUnePhrase;

const PROBLEMES = {
  activites: ACTIVITES_DE_PHRASE,
  finAutomatique: {
    sansFin: (cible: Activite, debut: string, fin: string) =>
      `${cible.defini} démarré${cible.accord} à ${debut} n’a jamais été arrêté${cible.accord} : fin automatique à ${fin}.`,
  },
} as const;

const REFUS_DE_REGULARISATION = {
  'activite-visee-introuvable': 'Cette activité est introuvable dans ce suivi.',
  'activite-deja-regularisee': 'Cette fin automatique est déjà régularisée.',
  'activite-non-echue':
    'Cette activité n’est pas une fin automatique : son échéance n’est pas atteinte, ou un pointage ou la clôture l’a déjà terminée.',
  'date-de-survenue-future': 'La fin ne peut pas être placée dans le futur.',
  'fin-avant-debut': 'La fin doit être postérieure au début de l’activité.',
  'fin-apres-borne': 'La fin ne peut pas dépasser le démarrage suivant ni la clôture.',
  'operateur-non-habilite': 'L’opérateur de cette activité n’est plus habilité sur son poste : la fin ne peut pas être régularisée.',
  'operateur-introuvable': 'L’opérateur de cette activité est introuvable.',
  'poste-de-travail-introuvable': 'Le poste de cette activité est introuvable.',
} as const satisfies Readonly<Record<CodeRefusRegularisation, string>>;

const REGULARISATION = {
  validerLaFin: (heure: string) => `Valider la fin à ${heure}`,
  validerLaFinSansHeure: 'Valider la fin',
  regularisee: (heure: string) => `Fin régularisée à ${heure}`,
  anomalieSuivante: 'Anomalie suivante',
  echec: 'La fin n’a pas pu être enregistrée. Votre saisie est conservée : réessayez.',
  dossierRelu: 'Le dossier a changé pendant la saisie : il a été relu. Placez de nouveau la fin.',
  refus: REFUS_DE_REGULARISATION,
} as const;

export const LIBELLES_ANOMALIES = {
  regularisation: REGULARISATION,
  choisirOperateur: 'Choisissez l’opérateur',
  tousLesOperateurs: 'Tous les opérateurs',
  rechercherOperateur: 'Rechercher un opérateur',
  aucunOperateur: 'Aucun opérateur disponible',
  aucunResultatOperateur: 'Aucun opérateur ne correspond à cette recherche',
  operateurNonResoluActuel: 'Opérateur non résolu (référence actuelle)',
  operateurActuelConserve: 'Opérateur actuel conservé',
  choisirElement: 'Choisissez l’élément',
  tousLesElements: 'Tous les éléments',
  rechercherElement: 'Rechercher un élément',
  aucunElement: 'Aucun élément disponible',
  aucunResultatElement: 'Aucun élément ne correspond à cette recherche',
  elementNonResoluActuel: 'Élément non résolu (référence actuelle)',
  elementActuelConserve: 'Élément actuel conservé',
  erreurLecture: 'Le dossier n’a pas pu être chargé.',
  reessayer: 'Réessayer',
  retour: 'Retour aux anomalies',
  dossier: 'Dossier d’anomalie de pointage',
  chargementDossier: 'Chargement du dossier…',
  operateurInconnu: 'l’opérateur',
  voirLaJournee: (operateur: string) => `Voir la journée de ${operateur}`,
  pointagesEtActivites: 'Pointages et activités',
  gestes: GESTES,
  types: { DEBUT: 'Travail', NON_CONFORMITE: 'Non-conformité' },
  titre: 'Anomalies de pointage',
  sousTitre: 'Activités arrêtées par la fin automatique : ouvrez un dossier pour placer la fin réelle.',
  element: 'Élément',
  operateur: 'Opérateur',
  sansPoste: 'Sans poste',
  operateurNonResolu: 'Opérateur non résolu',
  posteNonResolu: 'Poste non résolu',
  frise: {
    heureProposee: 'heure proposée',
    finAutomatique: 'Fin automatique',
    cloture: 'Clôture',
    poignee: 'Heure proposée du fait',
    heureInconnue: 'Heure ?',
    aucuneHeure: 'Aucune heure posée',
    placerLaFinReelle: 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle, puis validez.',
    symboles: SYMBOLES_DES_GESTES,
  },
  problemes: PROBLEMES,
} as const;
