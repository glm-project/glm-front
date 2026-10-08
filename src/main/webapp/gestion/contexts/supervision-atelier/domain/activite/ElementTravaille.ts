import { CategorieDElement } from './CategorieDElement';
import { ReferenceDElement } from './ReferenceDElement';

export interface DescriptionElementTravaille {
  readonly categorie: CategorieDElement;
  readonly nom: string;
  readonly reference?: ReferenceDElement;
}

export class ElementTravaille {
  readonly categorie: CategorieDElement;
  readonly nom: string;
  readonly reference: ReferenceDElement | undefined;

  constructor(description: DescriptionElementTravaille) {
    this.categorie = description.categorie;
    this.nom = description.nom;
    this.reference = description.reference;
  }
}
