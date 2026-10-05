import { DemandeDePointages } from './DemandeDePointages';
import { PointagesDeLaSemaine } from './PointagesDeLaSemaine';

export abstract class PointagesDeLOperateurPort {
  abstract semaine(demande: DemandeDePointages): Promise<PointagesDeLaSemaine>;
}
