import { TypePointage } from '../../domain/dossier/DossierAnomalie';

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

export const LIBELLES_ANOMALIES = {
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
  adresseInvalide: 'L’adresse doit préciser un suivi et un pointage.',
  dossierIntrouvable: 'Cette anomalie est introuvable ou ne relève plus d’une fin automatique à régulariser.',
  retour: 'Retour aux anomalies',
  dossier: 'Dossier d’anomalie de pointage',
  chargementDossier: 'Chargement du dossier…',
  operateurInconnu: 'l’opérateur',
  voirLaJournee: (operateur: string) => `Voir la journée de ${operateur}`,
  pointagesEtActivites: 'Pointages et activités',
  gestes: GESTES,
  types: { DEBUT: 'Travail', NON_CONFORMITE: 'Non-conformité' },
  titre: 'Anomalies de pointage',
  sousTitre: 'Comprendre les faits, choisir une correction et vérifier ses conséquences avant de l’enregistrer.',
  element: 'Élément',
  operateur: 'Opérateur',
  sansPoste: 'Sans poste',
  operateurNonResolu: 'Opérateur non résolu',
  posteNonResolu: 'Poste non résolu',
  frise: {
    heureProposee: 'heure proposée',
    finAutomatique: 'Fin automatique',
    poignee: 'Heure proposée du fait',
    heureInconnue: 'Heure ?',
    aucuneHeure: 'Aucune heure posée',
    placerLaFinReelle: 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle.',
    symboles: SYMBOLES_DES_GESTES,
  },
  problemes: PROBLEMES,
} as const;
