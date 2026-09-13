import { IdentifiantOperateur } from './IdentifiantOperateur';
import { OperateurDeclare } from './OperateurDeclare';

export class ActiviteDeSupervision {
  constructor(
    readonly id: string,
    readonly operateurId: IdentifiantOperateur | undefined,
    readonly nom: string,
    readonly categorie: string,
    readonly debut: string,
    readonly poste?: string,
  ) {}

  isFor(operateurId: IdentifiantOperateur): boolean {
    const id = this.operateurId;
    if (id === undefined) {
      return false;
    }
    return id.equals(operateurId);
  }

  isNc(): boolean {
    return this.categorie === 'NC';
  }

  aUnOperateurIdentifiable(operateursDeclares: readonly OperateurDeclare[]): boolean {
    const id = this.operateurId;
    if (id === undefined) {
      return false;
    }
    return operateursDeclares.some(operateur => operateur.id.equals(id));
  }
}
