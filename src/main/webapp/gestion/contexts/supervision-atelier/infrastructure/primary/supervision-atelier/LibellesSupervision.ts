import { Instant } from '../../../domain/instant/Instant';
import { AnomalieDeSupervision } from '../../../domain/supervision/AnomalieDeSupervision';
import { CouloirDeSupervision } from '../../../domain/supervision/CouloirDeSupervision';

export interface LibellesCouloir {
  readonly titre: string;
  readonly definition: string;
}

/** Un instant découpé pour l'écran : `jour` n'existe que lorsqu'il tombe un autre jour que l'instant d'évaluation. */
export interface MomentAffiche {
  readonly instant: Instant;
  readonly avant: string;
  readonly jour: string | undefined;
  readonly apres: string;
}

const COULOIRS: Record<CouloirDeSupervision, LibellesCouloir> = {
  AU_TRAVAIL: { titre: 'Au travail', definition: 'présents, au moins une activité en cours' },
  SANS_AFFECTATION: { titre: 'Sans affectation', definition: 'présents, aucune activité' },
  EN_PAUSE: { titre: 'En pause', definition: 'pause en cours ; leurs activités restent ouvertes' },
  ABSENT: { titre: 'Absents', definition: 'aucune venue ouverte' },
};

const ANOMALIES: Record<AnomalieDeSupervision, string> = {
  ACTIVITE_D_UN_ABSENT: 'Activité d’un opérateur absent',
  JOURNEE_OUVERTE_SANS_FENETRES: 'Venue ouverte sans heure d’arrivée',
  JOURNEE_OUVERTE_PLUS_DE_16_HEURES: 'Aucun départ pointé depuis plus de 16\u00a0h',
};

const NOMS_CITES_AU_PLUS = 6;

const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const JOUR = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
const DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const heure = (instant: Instant): string => HEURE.format(new Date(instant.value));

const isMemeJour = (instant: Instant, reference: Instant): boolean =>
  DATE.format(new Date(instant.value)) === DATE.format(new Date(reference.value));

const citeLesNoms = (noms: readonly string[]): boolean => noms.length > 0 && noms.length <= NOMS_CITES_AU_PLUS;

const pluriel = (nombre: number, singulier: string, plurielDuMot: string): string => (nombre > 1 ? plurielDuMot : singulier);

export const LIBELLES_SUPERVISION = {
  titre: 'Supervision de l’atelier',
  actualiser: 'Actualiser',
  chargement: 'Chargement des données de supervision…',
  erreur: 'Impossible de charger les données de supervision. Réessayez avec « Actualiser ».',
  vide: 'Aucun opérateur déclaré.',
  couloirs: COULOIRS,
  anomalies: ANOMALIES,
  personne: 'Personne',
  presents: 'Présents',
  nombreDePresents: (nombre: number): string => pluriel(nombre, 'présent', 'présents'),
  enNc: 'en NC',
  aVerifier: 'à vérifier',
  suspendue: '(suspendue)',
  suspendues: '(suspendues)',
  nc: 'NC',
  aucuneActivite: 'Aucune activité en cours',
  activiteSuspendue: 'suspendue',
  arrivee: 'arrivée',
  pauseDepuis: 'pause depuis',
  depuis: 'depuis',
  noteAbsents:
    'Absent = aucune venue ouverte. Une arrivée non pointée ou un pupitre hors ligne peut faire paraître absent quelqu’un qui est là, ou présent quelqu’un qui est parti.',
  fraicheur: (total: number, instant: Instant): string =>
    `${total} ${pluriel(total, 'opérateur', 'opérateurs')} · d’après les pointages reçus jusqu’à ${heure(instant)} · actualisé toutes les 30 s`,
  signal: (libelle: string, noms: readonly string[]): string => (citeLesNoms(noms) ? `${libelle}\u00a0: ${noms.join(', ')}` : libelle),
  moment: (prefixe: string, instant: Instant, reference: Instant): MomentAffiche =>
    isMemeJour(instant, reference)
      ? { instant, avant: `${prefixe} `, jour: undefined, apres: heure(instant) }
      : { instant, avant: `${prefixe} le `, jour: JOUR.format(new Date(instant.value)), apres: ` à ${heure(instant)}` },
} as const;
