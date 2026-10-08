import { AdresseDossier, DossierAnomalie } from '../../../../domain/dossier/DossierAnomalie';

export interface LectureDuDossier {
  relire(adresse: AdresseDossier): Promise<DossierAnomalie | undefined>;
  remplacerPar(dossier: DossierAnomalie): void;
}
