import { ElementChiffreId } from '../element/ElementChiffreId';
import { TypeDElementChiffre } from '../element/TypeDElementChiffre';

export class ElementCite {
  constructor(
    readonly id: ElementChiffreId,
    readonly nom: string | undefined,
    readonly type: TypeDElementChiffre | undefined,
  ) {}
}
