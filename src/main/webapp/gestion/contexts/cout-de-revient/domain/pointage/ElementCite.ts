import { CategorieDElementChiffre } from '../element/CategorieDElementChiffre';
import { ElementChiffreId } from '../element/ElementChiffreId';

export class ElementCite {
  constructor(
    readonly id: ElementChiffreId,
    readonly nom: string | undefined,
    readonly categorie: CategorieDElementChiffre | undefined,
  ) {}
}
