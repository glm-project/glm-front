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

const heure = (instant: InstantDeReleve): string => HEURE.format(instant.value);

const PRESENCE = 'Présence';
const PAUSE = 'Pause';
const EN_COURS = 'en cours';
const DEPUIS_LA_VEILLE = 'depuis la veille';
const SE_POURSUIT = 'se poursuit';

/** Ce qui nomme une plage fermée : ses bornes, et les continuations qui remplacent minuit. */
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

  /** Ce qu'un bloc écrit en haut : « depuis la veille » remplace le minuit d'une plage venue de la veille. */
  debutDeBloc: (debut: InstantDeReleve, depuisLaVeille: boolean): string => (depuisLaVeille ? DEPUIS_LA_VEILLE : heure(debut)),
  /** Ce qu'un bloc écrit en bas : « présumée » ne s'accole qu'à une vraie heure de fin. */
  finDeBloc: (fin: InstantDeReleve, seLePoursuit: boolean, presumee: boolean): string => {
    if (seLePoursuit) {
      return SE_POURSUIT;
    }
    return presumee ? `${heure(fin)} présumée` : heure(fin);
  },
  /** Les deux bornes d'un bloc moyen ou d'une ligne de note, sur une seule ligne. */
  bornes: (debut: string, fin: string): string => `${debut} – ${fin}`,
  /** Une plage en cours se nomme par le pointage qui l'a ouverte, ou par la présence quand aucun n'a son instant. */
  puceEnCours: (type: TypeDePointage | undefined, debut: InstantDeReleve): string =>
    `${type === undefined ? PRESENCE : TYPES[type]} ${heure(debut)}`,
  pucePause: (debut: InstantDeReleve): string => `${PAUSE} ${heure(debut)}`,

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
  enonceDePause: (debut: InstantDeReleve | undefined, fin: InstantDeReleve): string =>
    debut === undefined ? `${PAUSE} ${DEPUIS_LA_VEILLE} jusqu’à ${heure(fin)}` : `${PAUSE} ${heure(debut)} – ${heure(fin)}`,
  enonceDePauseSansReprise: (debut: InstantDeReleve, enCours: boolean): string =>
    `${PAUSE} depuis ${heure(debut)}, ${enCours ? EN_COURS : 'sans reprise ce jour'}`,
} as const;
