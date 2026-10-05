import { OperateurId } from './OperateurId';
import { SemaineISO } from './semaine/SemaineISO';

export class DemandeDePointages {
  constructor(
    readonly operateur: OperateurId,
    readonly semaine: SemaineISO,
  ) {}
}
