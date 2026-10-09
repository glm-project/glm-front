import { CibleDePointage } from './CibleDePointage';
import { InstantDeReleve } from './InstantDeReleve';
import { PointageReleveId } from './PointageReleveId';
import { TypeDePointage } from './TypeDePointage';

export interface FicheDePointage {
  readonly id: PointageReleveId;
  readonly type: TypeDePointage;
  readonly instant: InstantDeReleve;
  readonly cible: CibleDePointage;
}

export class PointageDElement {
  readonly id: PointageReleveId;
  readonly type: TypeDePointage;
  readonly instant: InstantDeReleve;
  readonly cible: CibleDePointage;

  constructor(fiche: FicheDePointage) {
    this.id = fiche.id;
    this.type = fiche.type;
    this.instant = fiche.instant;
    this.cible = fiche.cible;
  }
}
