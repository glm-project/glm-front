import { Cout } from '../montant/Cout';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { NatureDOperation } from './NatureDOperation';

export interface FicheDeLigne {
  readonly nature: NatureDOperation | undefined;
  readonly periode: PeriodeDeTravail;
  readonly temps: TempsPasse;
  readonly cout: Cout;
  readonly nonConformites: readonly PeriodeDeTravail[];
}

/**
 * Tout ce qui a été fait sur l'élément à une même nature d'opération.
 *
 * La nature manque quand le pointage n'a engagé aucun poste : c'est le comportement nominal d'une
 * entreprise sans parc machine, pas un cas dégradé, et l'opérateur y reste payé.
 */
export class LigneDeCout {
  readonly nature: NatureDOperation | undefined;
  readonly periode: PeriodeDeTravail;
  readonly temps: TempsPasse;
  readonly cout: Cout;
  readonly nonConformites: readonly PeriodeDeTravail[];

  constructor(fiche: FicheDeLigne) {
    this.nature = fiche.nature;
    this.periode = fiche.periode;
    this.temps = fiche.temps;
    this.cout = fiche.cout;
    this.nonConformites = [...fiche.nonConformites];
  }

  estSansPoste(): boolean {
    return this.nature === undefined;
  }
}
