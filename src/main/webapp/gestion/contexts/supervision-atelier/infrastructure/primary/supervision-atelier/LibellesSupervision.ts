import { ElementTravaille } from '../../../domain/activite/ElementTravaille';
import { TypeDElement } from '../../../domain/activite/TypeDElement';
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

const TYPES: Record<TypeDElement, string> = {
  PRODUIT: 'Moule',
  ORDRE_DE_FABRICATION: 'OF',
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
  personne: 'Personne',
  enNc: 'en NC',
  aVerifier: 'à vérifier',
  nc: 'NC',
  types: TYPES,
  sansPoste: 'Sans poste',
  metier: 'Métier\u00a0:',
  metiers: 'Métiers\u00a0:',
  aucuneActivite: 'Aucune activité en cours',
  depuis: 'depuis',
  fin: 'fin',
  termineeAutomatiquement: 'Activité terminée automatiquement',
  sequenceEnConflit: 'Séquence en conflit',
  aResoudre: 'À résoudre',
  objet: (objet: ElementTravaille): string => `${TYPES[objet.type]} ${objet.reference?.value ?? objet.nom}`,
  fraicheur: (total: number, instant: Instant): string =>
    `${total} ${pluriel(total, 'opérateur', 'opérateurs')} · d’après les pointages reçus jusqu’à ${heure(instant)} · actualisé toutes les 30 s`,
  listeDesMetiers: (metiers: readonly NatureDeTravail[]): string => metiers.map(metier => metier.value).join(', '),
  signal: (libelle: string, noms: readonly string[]): string => (citeLesNoms(noms) ? `${libelle}\u00a0: ${noms.join(', ')}` : libelle),
  moment: (prefixe: string, instant: Instant, reference: Instant): MomentAffiche =>
    isMemeJour(instant, reference)
      ? { instant, avant: `${prefixe} `, jour: undefined, apres: heure(instant) }
      : { instant, avant: `${prefixe} `, jour: `le ${JOUR.format(new Date(instant.value))}`, apres: ` à ${heure(instant)}` },
} as const;
