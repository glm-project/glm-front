import { FiltreAnomalies } from './DossierAnomalie';
import { readPageAnomaliesDemandee } from './PageAnomaliesDemandee';

export interface ParametresDeLAdresse {
  get(nom: string): string | null;
}

export const filtreAnomaliesDemande = (parametres: ParametresDeLAdresse): FiltreAnomalies => ({
  operateur: parametres.get('operateur') ?? '',
  element: parametres.get('element') ?? '',
  page: readPageAnomaliesDemandee(parametres.get('page')) ?? 1,
});
