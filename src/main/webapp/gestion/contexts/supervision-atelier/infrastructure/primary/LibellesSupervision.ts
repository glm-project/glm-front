import { EtatDePresence } from '../../domain/EtatDePresence';

const PRESENCES: Record<EtatDePresence, string> = {
  PRESENT: 'Présent',
  EN_PAUSE: 'En pause',
  ABSENT: 'Absent',
};

export const LIBELLES_SUPERVISION = {
  titre: 'Supervision de l’atelier',
  actualiser: 'Actualiser',
  chargement: 'Chargement des données de supervision…',
  erreur: 'Impossible de charger les données de supervision. Réessayez avec « Actualiser ».',
  vide: 'Aucun opérateur déclaré.',
  presences: PRESENCES,
} as const;
