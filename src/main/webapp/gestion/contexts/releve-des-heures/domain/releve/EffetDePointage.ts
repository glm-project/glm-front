import { ElementReleveId } from '../element/ElementReleveId';
import { CibleDePointage } from './CibleDePointage';

export class EffetDePointage {
  constructor(readonly clotures: readonly CibleDePointage[]) {}

  elementsClos(): readonly ElementReleveId[] {
    const elements = this.clotures.map(cible => cible.element);
    return elements.filter((element, rang) => elements.findIndex(autre => autre.estLeMeme(element)) === rang);
  }
}
