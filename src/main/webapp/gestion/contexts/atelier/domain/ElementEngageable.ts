import { DesignationDElement } from './DesignationDElement';
import { ElementEngageId } from './ElementEngageId';
import { TypeDElementEngage } from './TypeDElementEngage';

export interface FicheDElementEngageable {
  readonly designation: DesignationDElement;
  readonly type: TypeDElementEngage;
}

export class ElementEngageable {
  readonly designation: DesignationDElement;
  readonly type: TypeDElementEngage;

  constructor(
    readonly id: ElementEngageId,
    fiche: FicheDElementEngageable,
  ) {
    this.designation = fiche.designation;
    this.type = fiche.type;
  }
}
