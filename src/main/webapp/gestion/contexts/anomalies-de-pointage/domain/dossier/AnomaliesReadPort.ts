import { AdresseDossier, FiltreAnomalies, LectureDossier, PageAnomalies } from './DossierAnomalie';
import { ElementAnomalie } from './ElementAnomalie';
import { ReferentielAnomalies } from './ReferentielAnomalies';

export abstract class AnomaliesReadPort {
  abstract list(filtre: FiltreAnomalies): Promise<PageAnomalies>;
  abstract read(adresse: AdresseDossier): Promise<LectureDossier>;
  abstract referentiel(): Promise<ReferentielAnomalies>;
  abstract elements(): Promise<readonly ElementAnomalie[]>;
}
