import { OperateurDeLaJourneeId } from './OperateurDeLaJourneeId';

export class OperateurDeLaJournee {
  constructor(
    readonly id: OperateurDeLaJourneeId,
    readonly nom: string,
    readonly prenom: string,
  ) {}
}
