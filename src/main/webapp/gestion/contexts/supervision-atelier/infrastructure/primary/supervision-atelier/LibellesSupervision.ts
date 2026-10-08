import {
  formatInstantNumericDayMonth,
  formatInstantTime,
  localCalendarDay,
} from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { Instant } from '../../../domain/instant/Instant';
import { NatureDeTravail } from '../../../domain/poste/NatureDeTravail';
import { CouloirDeSupervision } from '../../../domain/supervision/CouloirDeSupervision';

export interface LibellesCouloir {
  readonly titre: string;
  readonly definition: string;
}

export interface MomentAffiche {
  readonly instant: Instant;
  readonly avant: string;
  readonly jour: string | undefined;
  readonly apres: string;
}

const COULOIRS: Record<CouloirDeSupervision, LibellesCouloir> = {
  AU_TRAVAIL: { titre: 'Au travail', definition: 'au moins une activité interprétable en cours' },
  SANS_ACTIVITE: { titre: 'Sans activité', definition: 'aucune activité interprétable en cours' },
};

const NOMS_CITES_AU_PLUS = 6;

const heure = (instant: Instant): string => formatInstantTime(new Date(instant.value));

const isMemeJour = (instant: Instant, reference: Instant): boolean =>
  localCalendarDay(new Date(instant.value)) === localCalendarDay(new Date(reference.value));

const citeLesNoms = (noms: readonly string[]): boolean => noms.length > 0 && noms.length <= NOMS_CITES_AU_PLUS;

const pluriel = (nombre: number, singulier: string, plurielDuMot: string): string => (nombre > 1 ? plurielDuMot : singulier);

export const LIBELLES_SUPERVISION = {
  titre: 'Supervision de l’atelier',
  actualiser: 'Actualiser',
  chargement: 'Chargement des données de supervision…',
  erreur: 'Impossible de charger les données de supervision. Réessayez avec « Actualiser ».',
  vide: 'Aucun opérateur déclaré.',
  couloirs: COULOIRS,
  personne: 'Personne',
  enNc: 'en NC',
  aVerifier: 'à vérifier',
  nc: 'NC',
  sansPoste: 'Sans poste',
  metier: 'Métier\u00a0:',
  metiers: 'Métiers\u00a0:',
  aucuneActivite: 'Aucune activité en cours',
  depuis: 'depuis',
  fin: 'fin',
  termineeAutomatiquement: 'Activité terminée automatiquement',
  fraicheur: (total: number, instant: Instant): string =>
    `${total} ${pluriel(total, 'opérateur', 'opérateurs')} · d’après les pointages reçus jusqu’à ${heure(instant)} · actualisé toutes les 30 s`,
  listeDesMetiers: (metiers: readonly NatureDeTravail[]): string => metiers.map(metier => metier.value).join(', '),
  signal: (libelle: string, noms: readonly string[]): string => (citeLesNoms(noms) ? `${libelle}\u00a0: ${noms.join(', ')}` : libelle),
  moment: (prefixe: string, instant: Instant, reference: Instant): MomentAffiche =>
    isMemeJour(instant, reference)
      ? { instant, avant: `${prefixe} `, jour: undefined, apres: heure(instant) }
      : {
          instant,
          avant: `${prefixe} `,
          jour: `le ${formatInstantNumericDayMonth(new Date(instant.value))}`,
          apres: ` à ${heure(instant)}`,
        },
} as const;
