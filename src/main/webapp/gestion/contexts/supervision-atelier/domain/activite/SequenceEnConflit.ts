import { IdentifiantOperateur } from '../operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { PosteDeSupervision } from '../poste/PosteDeSupervision';
import { ActiviteDeSupervision } from './ActiviteDeSupervision';
import { IdentifiantSequence } from './IdentifiantSequence';

export interface DescriptionSequenceEnConflit {
  readonly id: IdentifiantSequence;
  readonly operateurId: IdentifiantOperateur | undefined;
  readonly activites: readonly ActiviteDeSupervision[];
  readonly poste?: PosteDeSupervision;
}

export class SequenceEnConflit {
  readonly id: IdentifiantSequence;
  readonly operateurId: IdentifiantOperateur | undefined;
  readonly activites: readonly ActiviteDeSupervision[];
  readonly poste: PosteDeSupervision | undefined;

  constructor(description: DescriptionSequenceEnConflit) {
    this.id = description.id;
    this.operateurId = description.operateurId;
    this.activites = [...description.activites];
    this.poste = description.poste;
  }

  isFor(operateurId: IdentifiantOperateur): boolean {
    return this.operateurId?.equals(operateurId) === true;
  }

  hasOperateurIdentifiable(operateurs: readonly OperateurDeclare[]): boolean {
    return (
      operateurs.some(operateur => this.isFor(operateur.id))
      && this.activites.every(activite => activite.hasOperateurIdentifiable(operateurs))
    );
  }
}
