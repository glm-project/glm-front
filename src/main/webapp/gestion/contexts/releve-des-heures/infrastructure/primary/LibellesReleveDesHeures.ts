import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { TypeDePointage } from '../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

const TYPES: Record<TypeDePointage, string> = {
  ARRIVEE: 'Arrivée',
  PAUSE: 'Pause',
  REPRISE: 'Reprise',
  DEPART: 'Départ',
};

/** `timeZone: 'UTC'` est indispensable : un jour calendaire est une date, et la lire en heure locale la décale. */
const PLAGE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

/** L'heure d'un pointage est un instant : elle s'affiche dans le fuseau du navigateur. Voir `AGENTS.md`. */
const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const dateDe = (jour: JourCalendaire): Date => new Date(`${jour.value}T00:00:00Z`);

const formatDuree = (duree: DureeTravaillee): string => `${duree.heures} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

export const LIBELLES_RELEVE_DES_HEURES = {
  titre: 'Synthèse des heures',
  retour: 'Opérateurs',
  retourAria: 'Revenir au référentiel des opérateurs',
  sousTitre: 'Le temps travaillé de la semaine, jour par jour, pauses déduites.',

  anneeLabel: 'Année',
  semaineLabel: 'Semaine',
  glyphePrecedente: '◀',
  glypheSuivante: '▶',
  semainePrecedenteAria: 'Semaine précédente',
  semaineSuivanteAria: 'Semaine suivante',
  optionSemaine: (numero: number): string => `Semaine ${numero}`,

  types: TYPES,
  colonnes: { jour: 'Jour', journee: 'Journée', duree: 'Travaillé' },
  tableau: 'Heures travaillées de la semaine, jour par jour',
  defilement: 'Frise des heures, défilement horizontal disponible',
  regle: 'Échelle des heures',

  sansPointage: 'Aucun pointage',
  sansValeur: '—',

  chargement: 'Chargement de la synthèse…',
  echec: 'Impossible de charger la synthèse des heures. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  operateurIntrouvable: 'Cet opérateur n’existe plus au référentiel : sa synthèse ne peut pas être établie.',
  adresseInvalide:
    'Cette adresse ne désigne pas une semaine que le calendrier porte. Revenez au référentiel pour repartir de la semaine en cours.',

  semaine: (semaine: SemaineISO): string =>
    `Semaine ${semaine.numero} · ${PLAGE.formatRange(dateDe(semaine.lundi()), dateDe(semaine.dimanche()))}`,
  identite: (nom: string, prenom: string): string => `${prenom} ${nom.toLocaleUpperCase('fr-FR')}`,
  total: (duree: DureeTravaillee): string => `Total : ${formatDuree(duree)}`,
  duree: formatDuree,
  jour: (jour: JourCalendaire): string => JOUR.format(dateDe(jour)),
  pointage: (type: TypeDePointage, instant: InstantDeReleve): string => `${TYPES[type]} ${HEURE.format(instant.value)}`,

  plage: (pause: boolean, debut: InstantDeReleve, fin: InstantDeReleve | undefined): string => {
    const nature = pause ? 'Pause' : 'Présence';
    if (fin === undefined) {
      return `${nature} depuis ${HEURE.format(debut.value)} · en cours`;
    }
    return `${nature} ${HEURE.format(debut.value)} – ${HEURE.format(fin.value)}`;
  },
  voirLesPointages: (jour: JourCalendaire): string => `Voir les pointages du ${JOUR.format(dateDe(jour))}`,
} as const;
