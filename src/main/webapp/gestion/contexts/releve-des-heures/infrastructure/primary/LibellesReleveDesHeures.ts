import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { TypeDePointage } from '../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

const TYPES: Record<TypeDePointage, string> = {
  ARRIVEE: 'Arrivée',
  DEPART: 'Départ',
};

const PLAGE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const dateDe = (jour: JourCalendaire): Date => new Date(`${jour.value}T00:00:00Z`);

const formatDuree = (duree: DureeTravaillee): string => `${duree.heures} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const heure = (instant: InstantDeReleve): string => HEURE.format(instant.value);

const PRESENCE = 'Présence';
const PAUSE = 'Pause';
const EN_COURS = 'en cours';
const DEPUIS_LA_VEILLE = 'depuis la veille';
const SE_POURSUIT = 'se poursuit';

export interface FormeDePlage {
  readonly presumee: boolean;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve;
  readonly depuisLaVeille: boolean;
  readonly seLePoursuit: boolean;
}

const natureDe = (presumee: boolean): string => (presumee ? `${PRESENCE} présumée` : PRESENCE);

export const LIBELLES_RELEVE_DES_HEURES = {
  titre: 'Synthèse des heures',
  retour: 'Opérateurs',
  retourAria: 'Revenir au référentiel des opérateurs',
  sousTitre: 'Le temps travaillé de la semaine, jour par jour, pauses déduites.',

  anneeLabel: 'Année',
  semaineLabel: 'Semaine',
  semainePrecedenteAria: 'Semaine précédente',
  semaineSuivanteAria: 'Semaine suivante',
  optionSemaine: (numero: number): string => `Semaine ${numero}`,

  tableau: 'Heures travaillées de la semaine, jour par jour',
  defilement: 'Agenda des heures, défilement horizontal disponible',

  sansPointage: 'Aucun pointage',
  sansValeur: '—',
  aujourdhui: 'Aujourd’hui',
  enCours: EN_COURS,
  pause: PAUSE,
  pointages: 'Pointages',
  legende: { pointe: 'Pointé', presume: 'Présumé (à confirmer)', pause: PAUSE, enCours: 'En cours' },

  chargement: 'Chargement de la synthèse…',
  echec: 'Impossible de charger la synthèse des heures. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  operateurIntrouvable: 'Cet opérateur n’existe plus au référentiel : sa synthèse ne peut pas être établie.',
  adresseInvalide:
    'Cette adresse ne désigne pas une semaine que le calendrier porte. Revenez au référentiel pour repartir de la semaine en cours.',

  semaine: (semaine: SemaineISO): string =>
    `Semaine ${semaine.numero} · ${PLAGE.formatRange(dateDe(semaine.lundi()), dateDe(semaine.dimanche()))}`,
  identite: (nom: string, prenom: string): string => `${prenom} ${nom.toLocaleUpperCase('fr-FR')}`,
  pointe: (duree: DureeTravaillee): string => `Pointé : ${formatDuree(duree)}`,
  presume: (duree: DureeTravaillee): string => `Présumé, à confirmer : ${formatDuree(duree)}`,
  duree: formatDuree,
  presumees: (duree: DureeTravaillee): string => `+ ${formatDuree(duree)} présumées`,
  jour: (jour: JourCalendaire): string => JOUR.format(dateDe(jour)),
  pointage: (type: TypeDePointage, instant: InstantDeReleve): string => `${TYPES[type]} ${heure(instant)}`,

  debutDeBloc: (debut: InstantDeReleve, depuisLaVeille: boolean): string => (depuisLaVeille ? DEPUIS_LA_VEILLE : heure(debut)),
  finDeBloc: (fin: InstantDeReleve, seLePoursuit: boolean, presumee: boolean): string => {
    if (seLePoursuit) {
      return SE_POURSUIT;
    }
    return presumee ? `${heure(fin)} présumée` : heure(fin);
  },
  bornes: (debut: string, fin: string): string => `${debut} – ${fin}`,
  puceEnCours: (type: TypeDePointage | undefined, debut: InstantDeReleve): string =>
    `${type === undefined ? PRESENCE : TYPES[type]} ${heure(debut)}`,

  enonceDePlage: ({ presumee, debut, fin, depuisLaVeille, seLePoursuit }: FormeDePlage): string => {
    const nature = natureDe(presumee);
    if (depuisLaVeille) {
      return seLePoursuit
        ? `${nature} ${DEPUIS_LA_VEILLE}, se poursuit le lendemain`
        : `${nature} ${DEPUIS_LA_VEILLE} jusqu’à ${heure(fin)}`;
    }
    return seLePoursuit ? `${nature} depuis ${heure(debut)}, se poursuit le lendemain` : `${nature} ${heure(debut)} – ${heure(fin)}`;
  },
  enonceDePlageEnCours: (debut: InstantDeReleve): string => `${PRESENCE} depuis ${heure(debut)}, ${EN_COURS}`,
  enonceDePause: (fin: InstantDeReleve): string => `${PAUSE} ${DEPUIS_LA_VEILLE} jusqu’à ${heure(fin)}`,
} as const;
