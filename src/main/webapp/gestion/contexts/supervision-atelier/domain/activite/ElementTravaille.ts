import { HorsOf } from './HorsOf';
import { ReferenceDElement } from './ReferenceDElement';
import { TypeDElement } from './TypeDElement';

export interface DescriptionElementTravaille {
  readonly type: TypeDElement;
  readonly nom: string;
  readonly reference?: ReferenceDElement;
}

export class ElementTravaille {
  readonly type: TypeDElement;
  readonly nom: string;
  readonly reference: ReferenceDElement | undefined;

  constructor(description: DescriptionElementTravaille) {
    this.type = description.type;
    this.nom = description.nom;
    this.reference = description.reference;
  }

  isHorsOf(): this is HorsOf {
    return false;
  }
}
