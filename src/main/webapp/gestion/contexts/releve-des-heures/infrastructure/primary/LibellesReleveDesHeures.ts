import {
  formatCalendarDayFull,
  formatCalendarDayLong,
  formatCalendarDayRange,
  formatCalendarDayShort,
  formatInstantTime,
  formatInstantWeekdayDay,
  localCalendarDay,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { TotalDeDuree } from '../../domain/duree/TotalDeDuree';
import { CategorieDActivite } from '../../domain/element/CategorieDActivite';
import { ElementDuReleve } from '../../domain/element/ElementDuReleve';
import { PosteDeLElement } from '../../domain/element/PosteDeLElement';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { TypeDePointage } from '../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

const formatDuree = (duree: DureeTravaillee): string => `${duree.heures} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const heure = (instant: InstantDeReleve): string => formatInstantTime(instant.value);

const debutDOrigine = (debut: InstantDeReleve, jour: JourCalendaire): string =>
  localCalendarDay(debut.value) === jour.value ? heure(debut) : `${formatInstantWeekdayDay(debut.value)} à ${heure(debut)}`;

const MINUTES_PAR_HEURE = 60;

const nomDeLElement = (element: ElementDuReleve): string => `${element.categorie.value} ${element.numero()}`;

const POINTAGES: Record<TypeDePointage, string> = {
  DEBUT: 'Début',
  NON_CONFORMITE: 'Non-conformité',
  FIN: 'Fin',
};

const CATEGORIES_D_ACTIVITE: Record<CategorieDActivite, string> = { TRAVAIL: 'travail', NON_CONFORMITE: 'non-conformité' };

const posteEtNature = (poste: PosteDeLElement): string =>
  poste.nature === undefined ? poste.libelle : `${poste.libelle} · ${poste.nature}`;

const EN_COURS = 'en cours';

export interface FormeDActivite {
  readonly element: ElementDuReleve;
  readonly jour: JourCalendaire;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve;
}

export interface FormeDActiviteEnCours {
  readonly element: ElementDuReleve;
  readonly jour: JourCalendaire;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
}

export const LIBELLES_RELEVE_DES_HEURES = {
  titre: 'Temps opérationnel',
  vueSemaine: 'Vue de la semaine',
  axeSemaine: 'Même échelle chaque jour · 0 à 24 h',
  detailDuJour: 'Détail du jour',
  sansActiviteCeJour: 'Aucune activité ce jour',
  aVerifier: 'À vérifier',
  voirLesPointages: 'Voir les pointages',
  sansAnomalie: 'Aucune anomalie signalée cette semaine.',
  finAutomatiqueCourte: 'Fin auto.',
  retour: 'Opérateurs',
  semaineConsultee: 'Semaine consultée',
  retourAria: 'Revenir au référentiel des opérateurs',
  sousTitre: 'Une ligne par produit pointé dans la semaine.',
  sansPoste: 'Sans poste',
  operationnel: 'Temps opérationnel',
  operationnelPrecision: 'pointé sur les produits',
  colonneElement: 'Élément',
  colonneSemaine: 'Semaine',

  operateurLabel: 'Opérateur',
  echecNavigation: 'Impossible de changer d’opérateur. Choisissez à nouveau la personne à consulter.',
  aucunOperateur: 'Aucun opérateur disponible',
  echecOperateurs: 'Impossible de charger les opérateurs. Réessayez pour changer de personne.',
  chargementOperateurs: 'Chargement des opérateurs…',
  operateurConsulte: 'Consulté',
  aucunResultatOperateur: 'Aucun opérateur ne correspond à cette recherche',
  rechercherOperateur: 'Rechercher un opérateur',
  choisirOperateur: 'Choisir un opérateur',
  anneeLabel: 'Année',
  semaineLabel: 'Semaine',
  semainePrecedenteAria: 'Semaine précédente',
  semaineSuivanteAria: 'Semaine suivante',
  optionSemaine: (numero: number): string => `Semaine ${numero}`,

  tableau: 'Temps opérationnel de la semaine, jour par jour',
  defilement: 'Frise de la semaine, défilement horizontal disponible',

  sansValeur: '—',
  aujourdhui: 'Aujourd’hui',
  legende: {
    travail: 'Travail',
    nonConformite: 'Non-conformité',
    enCours: 'En cours',
    finAutomatique: 'Fin automatique',
    debut: 'Début pointé',
    nonConformitePointee: 'Non-conformité pointée',
    fin: 'Fin pointée',
  },

  chargement: 'Chargement du temps opérationnel…',
  echec: 'Impossible de charger le temps opérationnel de la semaine. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  operateurIntrouvable: 'Cet opérateur n’existe plus au référentiel : son temps opérationnel ne peut pas être établi.',
  adresseInvalide:
    'Cette adresse ne désigne pas une semaine ou un jour que le calendrier porte. Revenez au référentiel pour repartir de la semaine en cours.',

  semaine: (semaine: SemaineISO): string =>
    `Semaine ${semaine.numero} · ${formatCalendarDayRange(semaine.lundi().value, semaine.dimanche().value)}`,
  identite: (nom: string, prenom: string): string => `${prenom} ${nom.toLocaleUpperCase('fr-FR')}`,
  duree: (total: TotalDeDuree): string => {
    const lecture = total.snapshot();
    return lecture.complete ? formatDuree(lecture.valeur) : 'Incomplet';
  },
  nonConformite: (total: TotalDeDuree): string => {
    const lecture = total.snapshot();
    return lecture.complete ? `NC ${formatDuree(lecture.valeur)}` : 'NC Incomplet';
  },
  jour: (jour: JourCalendaire): string => formatCalendarDayShort(jour.value),
  nomDElement: nomDeLElement,
  heure,
  libelleDePointage: (type: TypeDePointage): string => POINTAGES[type],
  pointage: (type: TypeDePointage, instant: InstantDeReleve): string => `${POINTAGES[type]} ${heure(instant)}`,
  titreDuJournal: (jour: JourCalendaire, nombre: number): string => `Pointages du ${formatCalendarDayFull(jour.value)} · ${nombre}`,
  sansPointageCeJour: 'Aucun pointage ce jour',
  postes: (postes: readonly PosteDeLElement[]): string => postes.map(posteEtNature).join(', '),
  repere: (minutes: number): string => `${Math.floor(minutes / MINUTES_PAR_HEURE)} h`,

  enonceDActivite: ({ element, jour, categorie, debut, fin }: FormeDActivite): string => {
    const enonce = `${nomDeLElement(element)}, ${formatCalendarDayLong(jour.value)}, ${heure(debut)} à ${heure(fin)}, ${CATEGORIES_D_ACTIVITE[categorie]}`;
    return enonce;
  },
  finAutomatique: (fin: InstantDeReleve): string => `Fin automatique à ${heure(fin)} · Anomalie`,
  activiteEnCours: (debut: InstantDeReleve, jour: JourCalendaire): string => `En cours depuis ${debutDOrigine(debut, jour)}`,
  enonceDActiviteEnCours: ({ element, jour, categorie, debut }: FormeDActiviteEnCours): string =>
    `${nomDeLElement(element)}, ${formatCalendarDayLong(jour.value)}, depuis ${debutDOrigine(debut, jour)}, ${CATEGORIES_D_ACTIVITE[categorie]}, ${EN_COURS}`,
} as const;
