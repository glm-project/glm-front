import { CibleDePointage } from './CibleDePointage';
import { InstantDeReleve } from './InstantDeReleve';
import { TypeDePointageDElement } from './TypeDePointage';

export class PointageDElement {
  constructor(
    readonly type: TypeDePointageDElement,
    readonly instant: InstantDeReleve,
    readonly cible: CibleDePointage,
  ) {}
}
