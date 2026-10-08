import { FiltreAnomalies } from './DossierAnomalie';
import { NATURE_ANOMALIE_PAR_DEFAUT, readNatureAnomalieDemandee } from './NatureAnomalieDemandee';
import { readPageAnomaliesDemandee } from './PageAnomaliesDemandee';

export interface ParametresDeLAdresse {
  get(nom: string): string | null;
}

export const filtreAnomaliesDemande = (parametres: ParametresDeLAdresse): FiltreAnomalies => ({
  nature: readNatureAnomalieDemandee(parametres.get('nature')) ?? NATURE_ANOMALIE_PAR_DEFAUT,
  operateur: parametres.get('operateur') ?? '',
  element: parametres.get('element') ?? '',
  page: readPageAnomaliesDemandee(parametres.get('page')) ?? 1,
});
