import { InstantDeReleve } from './InstantDeReleve';
import { TypeDePointageDePresence } from './TypeDePointage';

export class PointageDePresence {
  constructor(
    readonly type: TypeDePointageDePresence,
    readonly instant: InstantDeReleve,
  ) {}
}
