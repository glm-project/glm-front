import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { CategorieDActivite } from '../../domain/element/CategorieDActivite';
import { ElementDuReleve } from '../../domain/element/ElementDuReleve';
import { PosteDeLElement } from '../../domain/element/PosteDeLElement';
import { TypeDElement } from '../../domain/element/TypeDElement';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { TypeDePointageDElement, TypeDePointageDePresence } from '../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';

const PLAGE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const JOUR_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' });

const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const dateDe = (jour: JourCalendaire): Date => new Date(`${jour.value}T00:00:00Z`);

const formatDuree = (duree: DureeTravaillee): string => `${duree.heures} h ${String(duree.minutesRestantes).padStart(2, '0')}`;

const heure = (instant: InstantDeReleve): string => HEURE.format(instant.value);

const MINUTES_PAR_HEURE = 60;

const TYPES_D_ELEMENT: Record<TypeDElement, string> = { PRODUIT: 'Moule', ORDRE_DE_FABRICATION: 'OF' };

const POINTAGES_DE_PRESENCE: Record<TypeDePointageDePresence, string> = { ARRIVEE: 'Arrivée', DEPART: 'Départ' };

const POINTAGES_D_ELEMENT: Record<TypeDePointageDElement, string> = { DEBUT: 'Début', NON_CONFORMITE: 'Non-conformité', FIN: 'Fin' };

const CATEGORIES_D_ACTIVITE: Record<CategorieDActivite, string> = { TRAVAIL: 'travail', NON_CONFORMITE: 'non-conformité' };

const posteEtNature = (poste: PosteDeLElement): string =>
  poste.nature === undefined ? poste.libelle : `${poste.libelle} · ${poste.nature}`;

const PRESENCE = 'Présence';
const PRESUME = 'présumé';
const EN_COURS = 'en cours';
const DEPUIS_LA_VEILLE = 'depuis la veille';

export interface FormeDActivite {
  readonly element: ElementDuReleve;
  readonly jour: JourCalendaire;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve;
  readonly presumee: boolean;
}

export interface FormeDActiviteEnCours {
  readonly element: ElementDuReleve;
  readonly jour: JourCalendaire;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
}

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
  sansPoste: 'Sans poste',
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
  legende: {
    travail: 'Travail',
    nonConformite: 'Non-conformité',
    presence: 'Présence',
    presume: 'Présumé (à confirmer)',
    enCours: 'En cours',
    debut: 'Début pointé',
    nonConformitePointee: 'Non-conformité pointée',
    fin: 'Fin pointée',
    presenceTrait: 'Arrivée, départ',
  },

  chargement: 'Chargement de la synthèse…',
  echec: 'Impossible de charger la synthèse des heures. Vérifiez la connexion puis réessayez.',
  reessayer: 'Réessayer',
  operateurIntrouvable: 'Cet opérateur n’existe plus au référentiel : sa synthèse ne peut pas être établie.',
  adresseInvalide:
    'Cette adresse ne désigne pas une semaine ou un jour que le calendrier porte. Revenez au référentiel pour repartir de la semaine en cours.',

  semaine: (semaine: SemaineISO): string =>
    `Semaine ${semaine.numero} · ${PLAGE.formatRange(dateDe(semaine.lundi()), dateDe(semaine.dimanche()))}`,
  identite: (nom: string, prenom: string): string => `${prenom} ${nom.toLocaleUpperCase('fr-FR')}`,
  presume: (duree: DureeTravaillee): string => `Présumé, à confirmer : ${formatDuree(duree)}`,
  duree: formatDuree,
  presumees: (duree: DureeTravaillee): string => `+ ${formatDuree(duree)} présumées`,
  nonConformite: (duree: DureeTravaillee): string => `NC ${formatDuree(duree)}`,
  jour: (jour: JourCalendaire): string => JOUR.format(dateDe(jour)),
  typeDElement: (type: TypeDElement): string => TYPES_D_ELEMENT[type],
  pointageDePresence: (type: TypeDePointageDePresence, instant: InstantDeReleve): string =>
    `${POINTAGES_DE_PRESENCE[type]} ${heure(instant)}`,
  pointageDElement: (type: TypeDePointageDElement, instant: InstantDeReleve): string => `${POINTAGES_D_ELEMENT[type]} ${heure(instant)}`,
  postes: (postes: readonly PosteDeLElement[]): string => postes.map(posteEtNature).join(', '),
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
  enonceDActivite: ({ element, jour, categorie, debut, fin, presumee }: FormeDActivite): string => {
    const enonce = `${TYPES_D_ELEMENT[element.type]} ${element.numero()}, ${JOUR_LONG.format(dateDe(jour))}, ${heure(debut)} à ${heure(fin)}, ${CATEGORIES_D_ACTIVITE[categorie]}`;
    return presumee ? `${enonce}, ${PRESUME}` : enonce;
  },
  enonceDActiviteEnCours: ({ element, jour, categorie, debut }: FormeDActiviteEnCours): string =>
    `${TYPES_D_ELEMENT[element.type]} ${element.numero()}, ${JOUR_LONG.format(dateDe(jour))}, depuis ${heure(debut)}, ${CATEGORIES_D_ACTIVITE[categorie]}, ${EN_COURS}`,
  enonceDePlageEnCours: (debut: InstantDeReleve): string => `${PRESENCE} depuis ${heure(debut)}, ${EN_COURS}`,
} as const;
