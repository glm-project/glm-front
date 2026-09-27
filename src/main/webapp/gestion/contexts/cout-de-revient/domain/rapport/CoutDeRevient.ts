import { ElementChiffre } from '../element/ElementChiffre';
import { Cout } from '../montant/Cout';
import { TempsPasse } from '../temps/TempsPasse';
import { LigneDeCout } from './LigneDeCout';

export interface FicheDuRapport {
  readonly lignes: readonly LigneDeCout[];
  readonly temps: TempsPasse;
  readonly cout: Cout;
}

export class CoutDeRevient {
  readonly lignes: readonly LigneDeCout[];
  readonly temps: TempsPasse;
  readonly cout: Cout;

  constructor(
    readonly element: ElementChiffre,
    fiche: FicheDuRapport,
  ) {
    this.lignes = [...fiche.lignes];
    this.temps = fiche.temps;
    this.cout = fiche.cout;
  }

  estSansTravail(): boolean {
    return this.lignes.length === 0;
  }
}
