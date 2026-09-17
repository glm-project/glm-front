import { InstantDeReleve } from './InstantDeReleve';
import { TypeDePointage } from './TypeDePointage';

export class PointageDeReleve {
  constructor(
    readonly type: TypeDePointage,
    readonly instant: InstantDeReleve,
  ) {}
}
