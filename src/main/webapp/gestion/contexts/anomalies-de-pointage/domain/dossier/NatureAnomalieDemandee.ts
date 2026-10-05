import { NatureAnomalie } from './DossierAnomalie';

export const NATURE_ANOMALIE_PAR_DEFAUT: NatureAnomalie = 'FIN_AUTOMATIQUE';

export const readNatureAnomalieDemandee = (parametre: string | null): NatureAnomalie | undefined => {
  if (parametre === null) return NATURE_ANOMALIE_PAR_DEFAUT;
  return parametre === 'CONFLIT' || parametre === 'FIN_AUTOMATIQUE' ? parametre : undefined;
};
