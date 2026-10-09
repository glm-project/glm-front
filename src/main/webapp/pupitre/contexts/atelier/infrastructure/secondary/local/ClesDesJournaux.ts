import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';

export const PREFIXE_DES_JOURNAUX = 'atelier-activites-v2:';
export const PREFIXES_DES_JOURNAUX_OBSOLETES = ['atelier:', 'atelier-activites-v1:'] as const;

export const keyFor = (entreprise: Entreprise): string => `${PREFIXE_DES_JOURNAUX}${entreprise.toString()}`;
