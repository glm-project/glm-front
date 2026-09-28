import { ElementReleveId } from '../element/ElementReleveId';
import { PosteReleveId } from '../element/PosteReleveId';
import { InstantDeReleve } from './InstantDeReleve';
import { TypeDePointageDElement } from './TypeDePointage';

export interface CibleDePointage {
  readonly element: ElementReleveId;
  readonly poste: PosteReleveId | undefined;
}

export class PointageDElement {
  constructor(
    readonly type: TypeDePointageDElement,
    readonly instant: InstantDeReleve,
    readonly cible: CibleDePointage,
  ) {}
}
