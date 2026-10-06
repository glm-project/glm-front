import { IntentionPointage, TypePointage } from '../../domain/acte/ActeResolution';
import { CodeRefusActe } from '../../domain/acte/AnomaliesActesPorts';

export interface ActiviteDansUnePhrase {
  readonly defini: string;
  readonly indefini: string;
  readonly accord: string;
}

const SIGNAL_A_CHOISIR = 'Choisissez ce que signale le pointage.';
const FAIT_DANS_LE_FUTUR = 'La date et l’heure du fait ne peuvent pas être dans le futur.';

const ERREURS_SAISIE: Readonly<Record<string, string>> = {
  ACTE_REQUIS: 'Choisissez un acte.',
  MOTIF_REQUIS: 'Renseignez un motif.',
  MOTIF_INVALIDE: 'Le motif doit contenir de 1 à 255 caractères.',
  OPERATEUR_REQUIS: 'Choisissez l’opérateur.',
  CIBLE_REQUISE: 'Choisissez l’activité visée.',
  CIBLE_INTERDITE: 'Une ouverture ne vise aucune activité ; effacez explicitement la cible.',
  INSTANT_INVALIDE: 'Renseignez la date et l’heure du fait.',
  INSTANT_AVANT_CIBLE: 'Le fait ne peut pas précéder le début de l’activité qu’il termine.',
  INSTANT_FUTUR: FAIT_DANS_LE_FUTUR,
  INTENTION_INCOMPATIBLE: 'Le type et l’intention ne sont pas compatibles.',
  TYPE_REQUIS: SIGNAL_A_CHOISIR,
  INTENTION_REQUISE: SIGNAL_A_CHOISIR,
};

const REFUS_ACTE: Readonly<Record<CodeRefusActe, string>> = {
  'proposition-invalide': 'La proposition n’est pas valide. Vérifiez la saisie, puis demandez un nouvel aperçu.',
  'confirmation-reutilisee': 'Cette confirmation a déjà été utilisée. Vérifiez le journal avant toute nouvelle décision.',
  'suivi-d-atelier-introuvable': 'Ce suivi d’atelier est introuvable.',
  'suivi-d-atelier-cloture': 'Ce suivi d’atelier est clôturé : il n’accepte plus de décision.',
  'evenement-d-atelier-introuvable': 'Le pointage visé est introuvable dans ce suivi.',
  'operateur-introuvable': 'L’opérateur indiqué est introuvable.',
  'poste-de-travail-introuvable': 'Le poste indiqué est introuvable.',
  'activite-visee-introuvable': 'L’activité visée est introuvable.',
  'operateur-non-habilite': 'L’opérateur indiqué n’est pas habilité sur ce poste.',
  'activite-visee-incoherente': 'L’activité visée ne correspond pas à ce pointage.',
  'evenement-deja-annule': 'Le pointage est déjà annulé.',
  'evenement-anterieur-a-l-engagement': 'Le fait est antérieur à l’engagement de l’élément.',
  'identifiant-evenement-reutilise': 'Le pointage à créer existe déjà. Demandez un nouvel aperçu.',
  'date-de-survenue-future': FAIT_DANS_LE_FUTUR,
};

const GESTES: Readonly<Record<TypePointage, Readonly<Partial<Record<IntentionPointage, string>>>>> = {
  DEBUT: { OUVERTURE: 'Démarrage', TRANSITION: 'Retour en bon' },
  NON_CONFORMITE: { OUVERTURE: 'Démarrage en NC', TRANSITION: 'Passage en NC' },
  FIN: { FIN: 'Arrêt' },
};

const SYMBOLES_DES_GESTES: Readonly<Record<TypePointage, Readonly<Partial<Record<IntentionPointage, string>>>>> = {
  DEBUT: { OUVERTURE: '▶', TRANSITION: '◇' },
  NON_CONFORMITE: { OUVERTURE: '▷', TRANSITION: '◆' },
  FIN: { FIN: '■' },
};

const ACTIVITES_DE_PHRASE = {
  TRAVAIL: { defini: 'le travail', indefini: 'un travail', accord: '' },
  NON_CONFORMITE: { defini: 'la non-conformité', indefini: 'une non-conformité', accord: 'e' },
  INCONNUE: { defini: 'l’activité', indefini: 'une activité', accord: 'e' },
} as const satisfies Readonly<Record<string, ActiviteDansUnePhrase>>;

type Activite = ActiviteDansUnePhrase;

const PROBLEMES = {
  activites: ACTIVITES_DE_PHRASE,
  pointageNonResolu: 'Un pointage non résolu',
  regularise: 'régularisé',
  memeCategorie: 'de même catégorie',
  categories: { TRAVAIL: 'en bon', NON_CONFORMITE: 'en NC' },
  conflit: {
    CIBLE_REMPLACEE: {
      avec: (sujet: string, cible: Activite, heure: string, terminant: string) =>
        `${sujet} vise ${cible.defini}, remplacé${cible.accord} à ${heure} par ${terminant}.`,
      sans: (sujet: string, cible: Activite) => `${sujet} vise ${cible.indefini} qui n’est plus en cours.`,
    },
    CIBLE_DEJA_TERMINEE: {
      avec: (sujet: string, cible: Activite, heure: string) => `${sujet} vise ${cible.defini}, déjà arrêté${cible.accord} à ${heure}.`,
      sans: (sujet: string, cible: Activite) => `${sujet} vise ${cible.indefini} déjà arrêté${cible.accord}.`,
    },
    GESTE_AVANT_OUVERTURE: {
      avec: (sujet: string, cible: Activite, heure: string) => `${sujet} vise ${cible.indefini} démarré${cible.accord} à ${heure}.`,
      sans: (sujet: string, cible: Activite) => `${sujet} vise ${cible.indefini} pas encore démarré${cible.accord}.`,
    },
    OUVRANT_ANNULE: {
      avec: (sujet: string, cible: Activite, ouvrant: string) => `${sujet} vise ${cible.indefini} dont ${ouvrant} est annulé.`,
      sans: (sujet: string, cible: Activite) => `${sujet} vise ${cible.indefini} dont le démarrage est annulé.`,
    },
    TRANSITION_MEME_CATEGORIE: {
      avec: (sujet: string, cible: Activite, heure: string, categorie: string) =>
        `${sujet} vise ${cible.defini} démarré${cible.accord} à ${heure}, déjà ${categorie}.`,
      sans: (sujet: string, cible: Activite, categorie: string) => `${sujet} vise ${cible.indefini} déjà ${categorie}.`,
    },
    CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE: {
      avec: (sujet: string, cible: Activite, heure: string) =>
        `${sujet} vise ${cible.defini} de ${heure}, déjà échu${cible.accord}, alors qu’une autre activité est en cours.`,
      sans: (sujet: string, cible: Activite) =>
        `${sujet} vise ${cible.indefini} déjà échu${cible.accord}, alors qu’une autre activité est en cours.`,
    },
    CONTRADICTION_REGULARISATION: {
      avec: (sujet: string, cible: Activite, heure: string) => `${sujet} vise ${cible.indefini} déjà arrêté${cible.accord} à ${heure}.`,
      sans: (sujet: string, cible: Activite) => `${sujet} vise ${cible.indefini} prolongé${cible.accord} par une régularisation.`,
    },
  },
  finAutomatique: {
    pointageTardif: (sujet: string, cible: Activite, fin: string) =>
      `${sujet} vise ${cible.defini}, déjà terminé${cible.accord} automatiquement à ${fin}.`,
    sansFin: (cible: Activite, debut: string, fin: string) =>
      `${cible.defini} démarré${cible.accord} à ${debut} n’a jamais été arrêté${cible.accord} : fin automatique à ${fin}.`,
    terminee: (cible: Activite, debut: string, fin: string) =>
      `${cible.defini} démarré${cible.accord} à ${debut} a été terminé${cible.accord} automatiquement à ${fin}.`,
  },
} as const;

const ACTIONS_DIRECTES = {
  titre: 'Actions directes',
  annuler: (pointage: string) => `Annuler ${pointage}`,
  corrigerLHeure: (pointage: string) => `Corriger l’heure ${pointage}`,
} as const;

export const LIBELLES_ANOMALIES = {
  actionsDirectes: ACTIONS_DIRECTES,
  autresCorrections: 'Autres corrections',
  autresCorrectionsAide:
    'Pour corriger ou annuler un autre pointage, sélectionnez-le sur la frise : les boutons sont dans le panneau Sélection.',
  debut: 'Début',
  finAutomatiqueA: 'Fin automatique',
  fin: 'Fin',
  corriger: 'Corriger ce pointage',
  regulariser: 'Ajouter un pointage manquant',
  annuler: 'Annuler ce pointage',
  verifier: 'Vérifier le reçu de confirmation',
  reprendreConfirmation: 'Reprendre la même confirmation',
  modifier: 'Modifier',
  modifierFait: 'Consulter ou modifier le fait proposé',
  decalerInstant: 'Décaler l’heure du fait',
  moinsCinqMinutes: '−5 min',
  plusCinqMinutes: '+5 min',
  cloture: 'Clôturé',
  ouvert: 'Ouvert',
  continuation: 'Autres conflits du suivi',
  traiterLaFinAutomatiqueRestante: (rang: number, total: number) =>
    total === 1 ? 'Traiter la fin automatique restante' : `Traiter la fin automatique restante (${rang} sur ${total})`,
  issue: {
    apercu: {
      TRAITEE: 'Après cet acte : anomalie traitée',
      CONFLIT_LEVE_FIN_AUTOMATIQUE_RESTANTE: 'Après cet acte : conflit levé · fin automatique restante',
      CONFLIT_RESTANT: 'Après cet acte : conflit restant',
      ANOMALIE_RESTANTE: 'Après cet acte : anomalie restante',
    },
    recu: {
      TRAITEE: 'Anomalie traitée',
      CONFLIT_LEVE_FIN_AUTOMATIQUE_RESTANTE: 'Conflit levé · fin automatique restante',
      CONFLIT_RESTANT: 'Acte enregistré, conflit restant',
      ANOMALIE_RESTANTE: 'Acte enregistré, anomalie restante',
    },
  },
  etats: {
    A_RESOUDRE: 'À résoudre',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée',
    REMPLACEE: 'Remplacée',
    ECHUE: 'Échue',
  },
  actes: {
    CORRECTION: 'Correction du pointage',
    ANNULATION: 'Annulation du pointage',
    REGULARISATION: 'Régularisation d’un fait manquant',
  },
  signal: 'Ce que signale le pointage',
  activiteTerminee: 'Activité qu’il termine',
  signalAChoisir: 'Choisissez ce que signale le pointage',
  operateurConcerne: 'Opérateur concerné',
  posteConcerne: 'Poste (facultatif)',
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
  posteNonResoluActuel: 'Poste non résolu (référence actuelle)',
  posteActuelConserve: 'Poste actuel conservé',
  postesHabilites: 'Postes habilités',
  autresPostes: 'Autres postes',
  chargementReferentiel: 'Chargement des opérateurs et des postes…',
  referentielIndisponible: 'Liste des opérateurs et des postes indisponible',
  champInstant: {
    legend: 'Date et heure du fait',
    date: 'Date',
    datePlaceholder: 'JJ/MM/AAAA',
    time: 'Heure',
    timePlaceholder: 'HH:MM:SS',
    openTimeList: 'Ouvrir la liste des heures',
    timeList: 'Heures proposées',
    skippedHour: 'Cette heure n’existe pas ce jour-là, à cause du changement d’heure.',
  },
  motif: 'Motif de la correction ou de l’annulation',
  motifAide: 'Obligatoire, 255 caractères au maximum.',
  previsualiser: 'Vérifier les conséquences',
  confirmer: 'Enregistrer cette décision',
  apercu: 'Vérifier avant d’enregistrer',
  comparerJournal: 'Comparer tous les pointages avant et après',
  avant: 'Avant',
  apres: 'Après cet acte',
  annule: 'Pointage annulé',
  remplace: 'Remplace le pointage',
  remplaceNonResolu: 'Remplace un pointage non résolu',
  regularisation: 'Régularisation',
  pointeApresLEcheance: 'Pointé après l’échéance',
  droits: 'La correction est réservée aux gestionnaires. Vous pouvez consulter les faits.',
  erreurLecture: 'Le dossier n’a pas pu être chargé.',
  reessayer: 'Réessayer',
  adresseInvalide: 'L’adresse doit préciser un suivi et un pointage.',
  absences: {
    INTROUVABLE: 'Ce pointage est introuvable dans ce suivi.',
    ANCRE_ANNULEE: 'Le pointage de cette adresse a été annulé ou remplacé.',
    SANS_ANOMALIE: 'Ce pointage ne relève plus d’une anomalie.',
  },
  operation: {
    REPOS: '',
    PREVISUALISATION: 'Prévisualisation en cours…',
    CONFIRMATION: 'Enregistrement en cours…',
    CONCURRENCE: 'Les données ont changé. Vérifiez un nouvel aperçu avant de confirmer.',
    ISSUE_INCONNUE: 'L’issue de l’écriture est inconnue. Vérifiez le journal avant toute nouvelle décision.',
    ERREUR: 'L’opération a échoué. Votre saisie est conservée.',
    REFUS: 'Acte refusé',
    APPLIQUE: 'Acte enregistré',
  },
  refus: REFUS_ACTE,
  erreurs: ERREURS_SAISIE,
  retour: 'Retour aux anomalies',
  dossier: 'Dossier d’anomalie de pointage',
  chargementDossier: 'Chargement du dossier…',
  chronologie: 'Pointages et rattachements',
  cible: 'Vise l’activité',
  creee: 'Crée l’activité',
  enregistrement: 'Enregistré le',
  decision: 'Votre décision',
  selection: 'Sélection',
  selectionVide: 'Sélectionnez un pointage ou une activité sur la frise pour voir ses détails.',
  pointagesEtActivites: 'Pointages et activités',
  choisir:
    'Choisissez ce qui correspond aux faits vérifiés. Ce choix prépare un acte ; vous vérifierez ses conséquences avant de l’enregistrer.',
  choix: {
    ANNULER_TRANSITION: {
      libelle: 'Annuler la transition',
      explication: 'Le pointage restera dans le journal avec votre motif d’annulation. Vérifiez ses conséquences dans l’aperçu.',
    },
    RATTACHER_FIN_A_ACTIVITE_REMPLACANTE: {
      libelle: 'Rattacher la fin à l’activité remplaçante',
      explication: 'La fin proposée visera l’activité indiquée dans les faits. Renseignez un motif, puis vérifiez l’aperçu.',
    },
    REGULARISER_FIN: {
      libelle: 'Régulariser la fin',
      explication: 'Aucune heure n’est proposée : saisissez l’heure réelle de fin, puis vérifiez l’aperçu avant d’enregistrer.',
    },
    CORRIGER_FIN_TARDIVE: {
      libelle: 'Corriger la fin pointée après l’échéance',
      explication: 'La fin pointée après l’échéance est reprise avec son heure. Renseignez un motif, puis vérifiez l’aperçu.',
    },
    CORRIGER_TRANSITION_TARDIVE: {
      libelle: 'Corriger la transition pointée après l’échéance',
      explication: 'La transition pointée après l’échéance est reprise avec son heure. Renseignez un motif, puis vérifiez l’aperçu.',
    },
  },
  gestes: GESTES,
  types: { DEBUT: 'Travail', NON_CONFORMITE: 'Non-conformité', FIN: 'Fin' },
  intentions: { OUVERTURE: 'Ouverture', TRANSITION: 'Transition', FIN: 'Fin ciblée' },
  titre: 'Anomalies de pointage',
  sousTitre: 'Comprendre les faits, choisir une correction et vérifier ses conséquences avant de l’enregistrer.',
  ouvrir: 'Examiner le dossier',
  element: 'Élément',
  operateur: 'Opérateur',
  poste: 'Poste',
  sansPoste: 'Sans poste',
  operateurNonResolu: 'Opérateur non résolu',
  activiteNonResolue: 'Activité non résolue',
  pointageNonResolu: 'Pointage non résolu',
  posteNonResolu: 'Poste non résolu',
  faits: 'Faits',
  diagnostic: 'Contradiction',
  frise: {
    annule: 'annulé',
    regularise: 'régularisé',
    enCause: 'en cause',
    tardif: 'pointé après l’échéance',
    heureRemplacee: 'heure remplacée',
    modifiee: 'modifiée',
    faitDeLActe: 'posé par cet acte',
    pointages: 'Pointages',
    poignee: 'Heure proposée du fait',
    placerLHeure: 'Cliquez sur la frise pour placer l’heure du fait, ou saisissez-la.',
    badgeRegularise: 'R',
    badgeTardif: '!',
    symboles: SYMBOLES_DES_GESTES,
    symboleInconnu: '•',
  },
  problemes: PROBLEMES,
} as const;
