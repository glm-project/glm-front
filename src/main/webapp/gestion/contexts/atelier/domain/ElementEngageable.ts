import { CategorieDElementEngage } from './CategorieDElementEngage';
import { DesignationDElement } from './DesignationDElement';
import { ElementEngageId } from './ElementEngageId';

export interface FicheDElementEngageable {
  readonly designation: DesignationDElement;
  readonly categorie: CategorieDElementEngage;
}

export class ElementEngageable {
  readonly designation: DesignationDElement;
  readonly categorie: CategorieDElementEngage;

  constructor(
    readonly id: ElementEngageId,
    fiche: FicheDElementEngageable,
  ) {
    this.designation = fiche.designation;
    this.categorie = fiche.categorie;
  }
}
