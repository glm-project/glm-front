import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

const PLAGE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const dateDe = (jour: JourCalendaire): Date => new Date(`${jour.value}T00:00:00Z`);

const formatDuree = (duree: DureeTravaillee): string => `${duree.heures} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const heure = (instant: InstantDeReleve): string => HEURE.format(instant.value);

const MINUTES_PAR_HEURE = 60;

const PRESENCE = 'Présence';
const EN_COURS = 'en cours';
const DEPUIS_LA_VEILLE = 'depuis la veille';

export interface FormeDePlage {
  readonly presumee: boolean;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve;
  readonly depuisLaVeille: boolean;
  readonly seLePoursuit: boolean;
}

const natureDe = (presumee: boolean): string => (presumee ? `${PRESENCE} présumée` : PRESENCE);

export const LIBELLES_RELEVE_DES_HEURES = {
  titre: 'Temps opérationnel',
  retour: 'Opérateurs',
  retourAria: 'Revenir au référentiel des opérateurs',
  sousTitre: 'Une ligne par moule ou OF pointé dans la semaine.',
  operationnel: 'Temps opérationnel',
  operationnelPrecision: 'pointé sur les moules et OF',
  presenceLigne: 'Présence',
  colonneElement: 'Élément',
  colonneSemaine: 'Semaine',

  anneeLabel: 'Année',
  semaineLabel: 'Semaine',
  semainePrecedenteAria: 'Semaine précédente',
  semaineSuivanteAria: 'Semaine suivante',
  optionSemaine: (numero: number): string => `Semaine ${numero}`,

  tableau: 'Temps opérationnel de la semaine, jour par jour',
  defilement: 'Frise de la semaine, défilement horizontal disponible',

  sansValeur: '—',
  aujourdhui: 'Aujourd’hui',
  legende: { pointe: 'Pointé', presume: 'Présumé (à confirmer)', enCours: 'En cours' },

  chargement: 'Chargement de la synthèse…',
  echec: 'Impossible de charger la synthèse des heures. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  operateurIntrouvable: 'Cet opérateur n’existe plus au référentiel : sa synthèse ne peut pas être établie.',
  adresseInvalide:
    'Cette adresse ne désigne pas une semaine que le calendrier porte. Revenez au référentiel pour repartir de la semaine en cours.',

  semaine: (semaine: SemaineISO): string =>
    `Semaine ${semaine.numero} · ${PLAGE.formatRange(dateDe(semaine.lundi()), dateDe(semaine.dimanche()))}`,
  identite: (nom: string, prenom: string): string => `${prenom} ${nom.toLocaleUpperCase('fr-FR')}`,
  presume: (duree: DureeTravaillee): string => `Présumé, à confirmer : ${formatDuree(duree)}`,
  duree: formatDuree,
  presumees: (duree: DureeTravaillee): string => `+ ${formatDuree(duree)} présumées`,
  jour: (jour: JourCalendaire): string => JOUR.format(dateDe(jour)),
  repere: (minutes: number): string => `${Math.floor(minutes / MINUTES_PAR_HEURE)} h`,

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
} as const;
