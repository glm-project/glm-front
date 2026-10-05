import { DossierAnomalie } from './DossierAnomalie';

export const conflitAExpliquer = (dossier: Pick<DossierAnomalie, 'enConflit'>): boolean => dossier.enConflit;
