import {
  formatCalendarDayFullWithYear,
  formatCalendarDayLong,
  formatInstantTime,
  formatInstantWeekdayDay,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { ActiviteDeLaJournee } from '../../domain/journee/ActiviteDeLaJournee';
import { BornesDuJour } from '../../domain/journee/BornesDuJour';
import { CategorieDActivite } from '../../domain/journee/CategorieDActivite';
import { Duree } from '../../domain/journee/Duree';
import { ElementDeLaJournee } from '../../domain/journee/ElementDeLaJournee';
import { InstantDeLaJournee } from '../../domain/journee/InstantDeLaJournee';
import { JourACorriger } from '../../domain/journee/JourACorriger';

const MINUTES_PAR_HEURE = 60;
const MILLISECONDES_PAR_MINUTE = 60_000;
const SANS_POSTE = 'Sans poste';
const EN_COURS = 'en cours';
const FIN_AUTOMATIQUE = 'fin automatique';

const heure = (instant: InstantDeLaJournee): string => formatInstantTime(instant.value);

const jourEtHeure = (instant: InstantDeLaJournee): string => `${formatInstantWeekdayDay(instant.value)} à ${heure(instant)}`;

const duree = (valeur: Duree): string => {
  const minutes = Math.floor(valeur.millisecondes / MILLISECONDES_PAR_MINUTE);
  return `${Math.floor(minutes / MINUTES_PAR_HEURE)} h ${String(minutes % MINUTES_PAR_HEURE).padStart(2, '0')}`;
};

const nomDeLElement = (element: ElementDeLaJournee): string => `${element.categorie.value} ${element.numero()}`;

const posteDe = (activite: ActiviteDeLaJournee): string => activite.poste?.libelle ?? SANS_POSTE;

const depuis = (activite: ActiviteDeLaJournee, bornes: BornesDuJour): string =>
  `depuis ${activite.debutAvantLeJour(bornes) === undefined ? heure(activite.debut) : jourEtHeure(activite.debut)}`;

const horaires = (activite: ActiviteDeLaJournee, bornes: BornesDuJour): string =>
  activite.etat.kind === 'EN_COURS' ? depuis(activite, bornes) : `${heure(activite.debut)} → ${heure(activite.etat.fin)}`;

const etatDe = (activite: ActiviteDeLaJournee): string | undefined => {
  switch (activite.etat.kind) {
    case 'EN_COURS':
      return EN_COURS;
    case 'TERMINEE_AUTOMATIQUEMENT':
      return FIN_AUTOMATIQUE;
    case 'TERMINEE':
      return undefined;
  }
};

const TYPES: Record<CategorieDActivite, string> = { TRAVAIL: 'Travail', NON_CONFORMITE: 'Non-conformité' };

export const LIBELLES_CORRECTION_DES_ACTIVITES = {
  page: {
    titre: 'Corriger la journée',
    retour: (identite: string | undefined): string => (identite === undefined ? 'Temps opérationnel' : `Temps opérationnel de ${identite}`),
    identite: (nom: string, prenom: string): string => `${prenom} ${nom.toLocaleUpperCase('fr-FR')}`,
    jour: (jour: JourACorriger): string => formatCalendarDayFullWithYear(jour.value),
    voirLeJour: (jour: JourACorriger): string => `Voir le ${formatCalendarDayLong(jour.value)}`,
    chargement: 'Chargement de la journée…',
    introuvable: 'Opérateur introuvable',
    echec: 'Impossible de charger la journée. Vérifiez la connexion puis réessayez.',
    reessayer: 'Réessayer',
    adresseInvalide: 'Cette adresse ne désigne pas un jour que l’on peut corriger. Revenez au relevé.',
  },
  activites: {
    titre: (nombre: number): string => `Activités du jour · ${nombre}`,
    vide: 'Aucune activité ce jour',
  },
  frise: {
    titre: 'La journée',
    operationnel: 'Opérationnel',
    colonneElement: 'Élément',
    vide: 'Aucune activité ce jour',
    repere: (minutes: number): string => `${Math.floor(minutes / MINUTES_PAR_HEURE)} h`,
    barre: (activite: ActiviteDeLaJournee, bornes: BornesDuJour): string =>
      [
        nomDeLElement(activite.element),
        posteDe(activite),
        horaires(activite, bornes),
        TYPES[activite.categorie].toLowerCase(),
        etatDe(activite),
      ]
        .filter(partie => partie !== undefined)
        .join(', '),
    debutPointe: (instant: InstantDeLaJournee): string => `Début ${heure(instant)}`,
    finPointee: (instant: InstantDeLaJournee): string => `Fin ${heure(instant)}`,
    debutAvant: (instant: InstantDeLaJournee): string => `← début le ${jourEtHeure(instant)}`,
    enCoursDepuis: (instant: InstantDeLaJournee): string => `← en cours depuis ${jourEtHeure(instant)}`,
    suite: (instant: InstantDeLaJournee): string => `suite le ${formatInstantWeekdayDay(instant.value)} →`,
    legende: {
      travail: 'Travail',
      nonConformite: 'Non-conformité',
      enCours: 'En cours',
      finAutomatique: 'Fin automatique',
      debut: 'Début',
      fin: 'Fin',
    },
  },
  duree,
  nomDeLElement,
  posteDe,
  horaires,
  etatDe,
  clotureLe: (instant: InstantDeLaJournee): string => `Clôturé le ${jourEtHeure(instant)}`,
  surLeTotal: (total: Duree): string => `sur ${duree(total)}`,
  debutLe: (jour: JourACorriger): string => `début le ${formatCalendarDayLong(jour.value)}`,
  finLe: (jour: JourACorriger): string => `fin le ${formatCalendarDayLong(jour.value)}`,
  type: (categorie: CategorieDActivite): string => TYPES[categorie],
} as const;
