import { Montant } from './Montant';

export class Cout {
  constructor(
    readonly machine: Montant,
    readonly mainDOeuvre: Montant,
    readonly total: Montant,
  ) {}
}
