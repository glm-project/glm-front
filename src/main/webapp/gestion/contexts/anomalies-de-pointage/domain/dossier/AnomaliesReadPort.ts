import { AdresseDossier, FiltreAnomalies, LectureDossier, PageAnomalies } from './DossierAnomalie';
import { ElementAnomalie } from './ElementAnomalie';
import { OperateurAnomalie } from './OperateurAnomalie';

export abstract class AnomaliesReadPort {
  abstract list(filtre: FiltreAnomalies): Promise<PageAnomalies>;
  abstract read(adresse: AdresseDossier): Promise<LectureDossier>;
  abstract operateurs(): Promise<readonly OperateurAnomalie[]>;
  abstract elements(): Promise<readonly ElementAnomalie[]>;
}
