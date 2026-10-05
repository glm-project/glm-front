import { NatureAnomalie } from './DossierAnomalie';

export const readNatureAnomalieDemandee = (parametre: string | null): NatureAnomalie | undefined => {
  if (parametre === null) return 'CONFLIT';
  return parametre === 'CONFLIT' || parametre === 'FIN_AUTOMATIQUE' ? parametre : undefined;
};
