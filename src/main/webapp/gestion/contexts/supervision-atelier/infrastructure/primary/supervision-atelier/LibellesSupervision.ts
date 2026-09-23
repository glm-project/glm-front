import { Instant } from '../../../domain/instant/Instant';
import { EtatDePresence } from '../../../domain/presence/EtatDePresence';
import { AnomalieDeSupervision } from '../../../domain/supervision/AnomalieDeSupervision';

const PRESENCES: Record<EtatDePresence, string> = {
  PRESENT: 'Présent',
  EN_PAUSE: 'En pause',
  ABSENT: 'Absent',
};

const ANOMALIES: Record<AnomalieDeSupervision, string> = {
  ACTIVITE_D_UN_ABSENT: 'Activité d’un opérateur absent',
  JOURNEE_OUVERTE_SANS_FENETRES: "Journée ouverte sans heure d'ouverture",
  JOURNEE_OUVERTE_PLUS_DE_16_HEURES: 'Journée ouverte depuis plus de 16 h',
};

const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const dateHeure = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

export const LIBELLES_SUPERVISION = {
  titre: 'Supervision de l’atelier',
  actualiser: 'Actualiser',
  chargement: 'Chargement des données de supervision…',
  erreur: 'Impossible de charger les données de supervision. Réessayez avec « Actualiser ».',
  vide: 'Aucun opérateur déclaré.',
  presences: PRESENCES,
  anomalies: ANOMALIES,
  nc: 'NC',
  sansAffectation: 'Sans affectation',
  sansAffectationDetails: 'Sans affectation · Aucune activité en cours',
  sansAffectationMaintenant: 'Sans affectation à l’instant courant',
  sansAffectationMaintenantHorsPlage: 'Sans affectation à l’instant courant · hors plage',
  ouverture: 'Journée ouverte depuis le',
  dateHeure: (instant: Instant): string => dateHeure.format(new Date(instant.value)),
  depuis: 'Depuis',
  heure: (instant: Instant): string => heure.format(new Date(instant.value)),
  tous: 'Tous',
  recherchePlaceholder: 'Rechercher un opérateur, un poste, une activité…',
  rechercheAriaLabel: 'Rechercher un opérateur, un poste ou une activité',
  reinitialiser: 'Réinitialiser',
  aucunResultat: 'Aucun opérateur ne correspond aux critères de recherche.',
  derniereLecture: (heureStr: string): string => `Dernière lecture réussie à ${heureStr} · Actualisation automatique toutes les 30 s`,
  ratioAffiches: (affiches: number, total: number): string =>
    `${affiches} affiché${affiches > 1 ? 's' : ''} sur ${total} déclaré${total > 1 ? 's' : ''}`,
  sansJourneeOuverte: 'Aucune journée ouverte',
} as const;
