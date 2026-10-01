import { TotalDeMontant } from './TotalDeMontant';

export class Cout {
  constructor(
    readonly machine: TotalDeMontant,
    readonly mainDOeuvre: TotalDeMontant,
    readonly total: TotalDeMontant,
  ) {}
}
