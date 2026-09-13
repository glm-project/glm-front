import { AnomalieDeSupervision } from '../../domain/AnomalieDeSupervision';
import { EtatDePresence } from '../../domain/EtatDePresence';
import { Instant } from '../../domain/Instant';

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
  glm: 'GLM',
  ouverture: 'Journée ouverte depuis le',
  dateHeure: (instant: Instant): string => dateHeure.format(new Date(instant.value)),
  depuis: 'Depuis',
  heure: (instant: Instant): string => heure.format(new Date(instant.value)),
} as const;
