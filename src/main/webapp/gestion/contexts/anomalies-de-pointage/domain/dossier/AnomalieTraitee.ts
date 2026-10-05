import { DossierAnomalie } from './DossierAnomalie';

export const anomalieTraitee = (dossier: Pick<DossierAnomalie, 'enConflit' | 'finAutomatique'>): boolean =>
  !dossier.enConflit && !dossier.finAutomatique;
