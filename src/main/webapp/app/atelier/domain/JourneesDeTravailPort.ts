import { TypeDePresence } from './TypeDePresence';

export abstract class JourneesDeTravailPort {
  abstract ensureOperateurArrived(operateurId: string): Promise<void>;

  abstract ensureOperateurPresent(operateurId: string): Promise<void>;

  abstract recordPresence(operateurId: string, type: TypeDePresence): Promise<void>;
}
