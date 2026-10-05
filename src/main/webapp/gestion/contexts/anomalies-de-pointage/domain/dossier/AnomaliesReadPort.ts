import { AdresseDossier, FiltreAnomalies, LectureDossier, PageAnomalies } from './DossierAnomalie';

export abstract class AnomaliesReadPort {
  abstract list(filtre: FiltreAnomalies): Promise<PageAnomalies>;
  abstract read(adresse: AdresseDossier): Promise<LectureDossier>;
}
