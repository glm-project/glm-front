import { InstantDeReleve } from './InstantDeReleve';
import { TypeDePointage } from './TypeDePointage';

export class PointageDePresence {
  constructor(
    readonly type: TypeDePointage,
    readonly instant: InstantDeReleve,
  ) {}
}
