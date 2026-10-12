import { FichierExporte } from './FichierExporte';

export abstract class EnregistrementDeFichierPort {
  abstract enregistre(fichier: FichierExporte): void;
}
