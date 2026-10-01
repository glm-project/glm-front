import { IdentifiantOperateur } from '../operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../operateur/OperateurDeclare';

export class ConflitDeSupervision {
  constructor(readonly operateurId: IdentifiantOperateur | undefined) {}

  hasOperateurIdentifiable(operateurs: readonly OperateurDeclare[]): boolean {
    return operateurs.some(operateur => this.isFor(operateur.id));
  }

  isFor(operateurId: IdentifiantOperateur): boolean {
    return this.operateurId?.equals(operateurId) === true;
  }
}
