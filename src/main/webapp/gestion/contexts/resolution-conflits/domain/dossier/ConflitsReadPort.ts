import { AdresseDossier, FiltreConflits, LectureDossier, PageConflits } from './DossierConflit';

export abstract class ConflitsReadPort {
  abstract list(filtre: FiltreConflits): Promise<PageConflits>;
  abstract read(adresse: AdresseDossier): Promise<LectureDossier>;
}
