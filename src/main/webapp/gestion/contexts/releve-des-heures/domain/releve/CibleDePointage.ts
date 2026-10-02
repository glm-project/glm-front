import { ElementReleveId } from '../element/ElementReleveId';
import { PosteReleveId } from '../element/PosteReleveId';

export class CibleDePointage {
  constructor(
    readonly element: ElementReleveId,
    readonly poste: PosteReleveId | undefined,
  ) {}
}
