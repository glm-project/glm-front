import { TypeDePresence } from './TypeDePresence';

export abstract class JourneesDeTravailPort {
  abstract sAssurerQueLOperateurEstArrive(operateurId: string): Promise<void>;

  abstract sAssurerQueLOperateurEstPresent(operateurId: string): Promise<void>;

  abstract pointerLaPresence(operateurId: string, type: TypeDePresence): Promise<void>;
}
