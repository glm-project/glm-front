import { AdresseDossier } from './DossierAnomalie';
import { PointageAnomalieId } from './PointageAnomalieId';
import { SuiviAnomalieId } from './SuiviAnomalieId';

export const adresseDossier = (suivi: string | null, pointage: string | null): AdresseDossier | undefined => {
  if (suivi === null) return undefined;
  if (pointage === null) return undefined;
  return { suivi: new SuiviAnomalieId(suivi), pointage: new PointageAnomalieId(pointage) };
};
