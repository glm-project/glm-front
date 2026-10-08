import { IntentionPointage, TypePointage } from '../../domain/acte/ActeResolution';
import { CodeRefusActe } from '../../domain/acte/AnomaliesActesPorts';

export interface ActiviteDansUnePhrase {
  readonly defini: string;
  readonly accord: string;
}

const GESTE_A_CHOISIR = 'Choisissez ce que signale le pointage.';
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
  TYPE_REQUIS: GESTE_A_CHOISIR,
  INTENTION_REQUISE: GESTE_A_CHOISIR,
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
  TRAVAIL: { defini: 'le travail', accord: '' },
  NON_CONFORMITE: { defini: 'la non-conformité', accord: 'e' },
} as const satisfies Readonly<Record<string, ActiviteDansUnePhrase>>;

type Activite = ActiviteDansUnePhrase;

const PROBLEMES = {
  activites: ACTIVITES_DE_PHRASE,
  pointageNonResolu: 'Un pointage non résolu',
  regularise: 'régularisé',
  finAutomatique: {
    pointageTardif: (sujet: string, cible: Activite, fin: string) =>
      `${sujet} vise ${cible.defini}, déjà terminé${cible.accord} automatiquement à ${fin}.`,
    sansFin: (cible: Activite, debut: string, fin: string) =>
      `${cible.defini} démarré${cible.accord} à ${debut} n’a jamais été arrêté${cible.accord} : fin automatique à ${fin}.`,
    terminee: (cible: Activite, debut: string, fin: string) =>
      `${cible.defini} démarré${cible.accord} à ${debut} a été terminé${cible.accord} automatiquement à ${fin}.`,
  },
} as const;

const RESOLUTION = {
  validerLaFin: (heure: string) => `Valider la fin à ${heure}`,
  validerLaFinSansHeure: 'Valider la fin',
  validerLePassage: (heure: string) => `Valider le passage à ${heure}`,
  validerLePassageSansHeure: 'Valider le passage',
  motifs: {
    finTardive: 'Arrêt pointé après l’échéance : heure vérifiée en gestion',
    passageTardif: 'Passage pointé après l’échéance : heure vérifiée en gestion',
  },
  activiteOuverte: {
    NON_CONFORMITE: 'La non-conformité commencera à cette heure.',
    TRAVAIL: 'Le travail reprendra à cette heure.',
  },
  autresFinsAutomatiques: (nombre: number) =>
    nombre === 1 ? '1 autre fin automatique sur cet élément' : `${nombre} autres fins automatiques sur cet élément`,
  anomalieSuivante: 'Anomalie suivante',
  verification: 'Vérification des conséquences…',
  reessayerLApercu: 'Réessayer l’aperçu',
  voirLeDetail: 'Voir le détail',
  consequences: 'Conséquences',
  resume: {
    TRAITEE: 'anomalie traitée',
    ANOMALIE_RESTANTE: 'anomalie restante',
    CONFLIT_RESTANT: 'conflit restant',
    CONFLIT_LEVE_FIN_AUTOMATIQUE_RESTANTE: 'conflit levé · fin automatique restante',
    finsAutomatiquesRestantes: (nombre: number) => (nombre === 1 ? '1 fin automatique restante' : `${nombre} fins automatiques restantes`),
  },
} as const;

export const LIBELLES_ANOMALIES = {
  resolution: RESOLUTION,
  verifier: 'Vérifier le reçu de confirmation',
  reprendreConfirmation: 'Reprendre la même confirmation',
  cloture: 'Clôturé',
  ouvert: 'Ouvert',
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
    ECHUE: 'Fin automatique',
  },
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
  posteActuelConserve: 'Poste actuel conservé',
  comparerJournal: 'Comparer tous les pointages avant et après',
  avant: 'Avant',
  apres: 'Après cet acte',
  annule: 'Pointage annulé',
  remplace: 'Remplace le pointage',
  remplaceNonResolu: 'Remplace un pointage non résolu',
  regularisation: 'Régularisation',
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
  cible: 'Vise l’activité',
  creee: 'Crée l’activité',
  voirLaJournee: (operateur: string) => `Voir la journée de ${operateur}`,
  pointagesEtActivites: 'Pointages et activités',
  gestes: GESTES,
  types: { DEBUT: 'Travail', NON_CONFORMITE: 'Non-conformité', FIN: 'Fin' },
  intentions: { OUVERTURE: 'Ouverture', TRANSITION: 'Transition', FIN: 'Fin ciblée' },
  titre: 'Anomalies de pointage',
  sousTitre: 'Comprendre les faits, choisir une correction et vérifier ses conséquences avant de l’enregistrer.',
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
    heureProposee: 'heure proposée',
    finAutomatique: 'Fin automatique',
    pointages: 'Pointages',
    poignee: 'Heure proposée du fait',
    heureInconnue: 'Heure ?',
    aucuneHeure: 'Aucune heure posée',
    placerLHeure: 'Tirez le bout de la barre ou cliquez dessus pour placer l’heure du fait, ou saisissez-la.',
    placerLaFinReelle: 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle.',
    badgeRegularise: 'R',
    badgeTardif: '!',
    symboles: SYMBOLES_DES_GESTES,
    symboleInconnu: '•',
    contexte: {
      operateurInconnu: 'l’opérateur',
      phrase: (operateur: string, groupes: string) => `Hors de cette anomalie, ${operateur} compte sur cet élément ${groupes}.`,
      pointages: (nombre: number) => (nombre === 1 ? '1 pointage' : `${nombre} pointages`),
      ceJourLa: 'ce jour-là',
      le: (jour: string) => `le ${jour}`,
      plusTot: (quand: string, heure: string) => `plus tôt ${quand} (dès ${heure})`,
      pendant: 'pendant cette période',
      plusTard: (quand: string, heure: string) => `plus tard ${quand} (jusqu’à ${heure})`,
      precedents: (jour: string) => `les jours précédents, depuis le ${jour}`,
      suivants: (jour: string) => `les jours suivants, jusqu’au ${jour}`,
      autresJours: 'les autres jours',
      et: ' et ',
      virgule: ', ',
    },
  },
  problemes: PROBLEMES,
} as const;
