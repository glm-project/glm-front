import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';

export const PREFIXE_DES_JOURNAUX = 'atelier-activites-v1:';

export const keyFor = (entreprise: Entreprise): string => `${PREFIXE_DES_JOURNAUX}${entreprise.toString()}`;
