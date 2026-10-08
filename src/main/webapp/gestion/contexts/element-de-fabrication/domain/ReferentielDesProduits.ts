import { CategorieDeProduit } from './CategorieDeProduit';
import { ElementDeFabrication } from './ElementDeFabrication';

export class ReferentielDesProduits {
  readonly categories: readonly CategorieDeProduit[];
  readonly elements: readonly ElementDeFabrication[];

  constructor(categories: readonly CategorieDeProduit[], elements: readonly ElementDeFabrication[]) {
    this.categories = [...categories];
    this.elements = [...elements];
  }

  estSansCategorie(): boolean {
    return this.categories.length === 0;
  }
}
