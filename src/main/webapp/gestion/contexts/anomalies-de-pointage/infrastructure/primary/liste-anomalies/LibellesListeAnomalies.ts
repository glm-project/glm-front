import {
  formatInstantShortWeekdayDay,
  formatInstantTime,
  localCalendarDay,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { NatureAnomalie } from '../../../domain/dossier/DossierAnomalie';

const aLHeure = (instant: Date): string => `${formatInstantShortWeekdayDay(instant)} à ${formatInstantTime(instant)}`;

const finAutomatique = (echeance: Date, debut: Date): string =>
  localCalendarDay(echeance) === localCalendarDay(debut) ? `à ${formatInstantTime(echeance)}` : aLHeure(echeance);

export const LIBELLES_LISTE_ANOMALIES = {
  filtrer: 'Filtrer',
  reessayer: 'Réessayer',
  precedente: 'Précédente',
  suivante: 'Suivante',
  page: 'Page',
  sur: 'sur',
  nature: 'Nature des anomalies',
  adresseInvalide: 'Numéro de page invalide. Appliquez les filtres pour revenir à la première page.',
  natureInconnue: 'Nature d’anomalie inconnue. Choisissez un onglet pour revenir à une liste valide.',
  premierePage: 'Revenir à la première page',
  erreurNavigation: 'Impossible d’appliquer les filtres. Réessayez ; la liste acquise reste consultable.',
  sequenceEnConflit: 'Séquence en conflit',
  periode: 'Début et fin automatique',
  periodeFinAutomatique: (debut: string, echeance: string): string => {
    const instantDebut = new Date(debut);
    return `Début ${aLHeure(instantDebut)} · fin automatique ${finAutomatique(new Date(echeance), instantDebut)}`;
  },
  onglets: [
    { nature: 'FIN_AUTOMATIQUE', libelle: 'Fins automatiques', selecteur: 'anomalies-onglet-fins-automatiques' },
    { nature: 'CONFLIT', libelle: 'Conflits', selecteur: 'anomalies-onglet-conflits' },
  ] as readonly { nature: NatureAnomalie; libelle: string; selecteur: string }[],
  natures: {
    CONFLIT: {
      chargement: 'Chargement des conflits…',
      vide: 'Aucun conflit à résoudre.',
      videFiltre: 'Aucun conflit ne correspond à ces filtres.',
      erreur: 'Impossible de charger les conflits. Réessayez pour obtenir une liste complète.',
      partiel: 'Liste partielle : certains dossiers n’ont pas pu être acquis. Cette sélection ne représente pas tous les conflits.',
      pagination: 'Pages des conflits',
      pageVide: 'Cette page ne contient plus de dossier. D’autres conflits restent dans la sélection.',
    },
    FIN_AUTOMATIQUE: {
      chargement: 'Chargement des fins automatiques…',
      vide: 'Aucune fin automatique à traiter.',
      videFiltre: 'Aucune fin automatique ne correspond à ces filtres.',
      erreur: 'Impossible de charger les fins automatiques. Réessayez pour obtenir une liste complète.',
      partiel:
        'Liste partielle : certains dossiers n’ont pas pu être acquis. Cette sélection ne représente pas toutes les fins automatiques.',
      pagination: 'Pages des fins automatiques',
      pageVide: 'Cette page ne contient plus de dossier. D’autres fins automatiques restent dans la sélection.',
    },
  },
} as const;
