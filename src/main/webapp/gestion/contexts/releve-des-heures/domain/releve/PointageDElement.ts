import { CibleDePointage } from './CibleDePointage';
import { InstantDeReleve } from './InstantDeReleve';
import { TypeDePointage } from './TypeDePointage';

export interface FicheDePointage {
  readonly type: TypeDePointage;
  readonly instant: InstantDeReleve;
  readonly cible: CibleDePointage;
}

export class PointageDElement {
  readonly type: TypeDePointage;
  readonly instant: InstantDeReleve;
  readonly cible: CibleDePointage;

  constructor(fiche: FicheDePointage) {
    this.type = fiche.type;
    this.instant = fiche.instant;
    this.cible = fiche.cible;
  }
}
