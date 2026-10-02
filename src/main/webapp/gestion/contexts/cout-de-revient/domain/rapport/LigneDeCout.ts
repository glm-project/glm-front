import { Cout } from '../montant/Cout';
import { PointageDeCout } from '../pointage/PointageDeCout';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { NatureDOperation } from './NatureDOperation';

export interface FicheDeLigne {
  readonly nature: NatureDOperation | undefined;
  readonly temps: TempsPasse;
  readonly cout: Cout;
  readonly finsAutomatiques: readonly PeriodeDeTravail[];
  readonly pointages: readonly PointageDeCout[];
}

export class LigneDeCout {
  readonly nature: NatureDOperation | undefined;
  readonly temps: TempsPasse;
  readonly cout: Cout;
  readonly finsAutomatiques: readonly PeriodeDeTravail[];
  readonly pointages: readonly PointageDeCout[];

  constructor(fiche: FicheDeLigne) {
    this.nature = fiche.nature;
    this.temps = fiche.temps;
    this.cout = fiche.cout;
    this.finsAutomatiques = [...fiche.finsAutomatiques];
    this.pointages = [...fiche.pointages];
  }

  estSansPoste(): boolean {
    return this.nature === undefined;
  }
}
