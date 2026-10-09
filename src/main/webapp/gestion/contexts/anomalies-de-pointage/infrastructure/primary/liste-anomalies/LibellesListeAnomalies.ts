import {
  formatInstantShortWeekdayDay,
  formatInstantTime,
  localCalendarDay,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';

const aLHeure = (instant: Date): string => `${formatInstantShortWeekdayDay(instant)} à ${formatInstantTime(instant)}`;

const finAutomatique = (echeance: Date, debut: Date): string =>
  localCalendarDay(echeance) === localCalendarDay(debut) ? `à ${formatInstantTime(echeance)}` : aLHeure(echeance);

export const LIBELLES_LISTE_ANOMALIES = {
  filtrer: 'Filtrer',
  plusAucuneAnomalie: 'Plus aucune anomalie',
  reessayer: 'Réessayer',
  precedente: 'Précédente',
  suivante: 'Suivante',
  page: 'Page',
  sur: 'sur',
  chargementOperateurs: 'Chargement des opérateurs…',
  operateursIndisponibles: 'Liste des opérateurs indisponible',
  chargementElements: 'Chargement des éléments…',
  elementsIndisponibles: 'Liste des éléments indisponible',
  adresseInvalide: 'Numéro de page invalide. Appliquez les filtres pour revenir à la première page.',
  premierePage: 'Revenir à la première page',
  erreurNavigation: 'Impossible d’appliquer les filtres. Réessayez ; la liste acquise reste consultable.',
  periode: 'Début et fin automatique',
  periodeFinAutomatique: (debut: string, echeance: string): string => {
    const instantDebut = new Date(debut);
    return `Début ${aLHeure(instantDebut)} · fin automatique ${finAutomatique(new Date(echeance), instantDebut)}`;
  },
  chargement: 'Chargement des fins automatiques…',
  vide: 'Aucune fin automatique à traiter.',
  videFiltre: 'Aucune fin automatique ne correspond à ces filtres.',
  erreur: 'Impossible de charger les fins automatiques. Réessayez pour obtenir une liste complète.',
  pagination: 'Pages des fins automatiques',
  pageVide: 'Cette page ne contient plus de dossier. D’autres fins automatiques restent dans la sélection.',
} as const;
