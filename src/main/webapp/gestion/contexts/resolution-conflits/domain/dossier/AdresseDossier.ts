import { AdresseDossier } from './DossierConflit';
import { PointageConflitId } from './PointageConflitId';
import { SuiviConflitId } from './SuiviConflitId';

export const adresseDossier = (suivi: string | null, pointage: string | null): AdresseDossier | undefined => {
  if (suivi === null) return undefined;
  if (pointage === null) return undefined;
  return { suivi: new SuiviConflitId(suivi), pointage: new PointageConflitId(pointage) };
};
