import { IdentiteDuGeste } from './PupitreLocal';
import { TypeDePresence } from './TypeDePresence';

export abstract class JourneesDeTravailPort {
  abstract ensureOperateurArrived(operateurId: string, identite: IdentiteDuGeste): Promise<void>;

  abstract ensureOperateurPresent(operateurId: string, identite: IdentiteDuGeste): Promise<void>;

  abstract recordPresence(operateurId: string, type: TypeDePresence, identite: IdentiteDuGeste): Promise<void>;
}
