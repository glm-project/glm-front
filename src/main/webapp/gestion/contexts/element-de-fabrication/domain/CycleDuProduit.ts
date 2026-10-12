export type CycleDuProduit = 'EN_PREPARATION' | 'EN_ATELIER' | 'CLOTURE';

export const CYCLES_DU_PRODUIT: readonly CycleDuProduit[] = ['EN_PREPARATION', 'EN_ATELIER', 'CLOTURE'];

export const CYCLE_PAR_DEFAUT: CycleDuProduit = 'EN_ATELIER';
