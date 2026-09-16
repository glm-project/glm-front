import { ElementDeFabricationId } from './ElementDeFabricationId';
import { LibelleDElement } from './LibelleDElement';
import { NomDElement } from './NomDElement';
import { ReferenceDElement } from './ReferenceDElement';
import { TypeDElementDeFabrication } from './TypeDElementDeFabrication';

export interface FicheDElement {
  readonly type: TypeDElementDeFabrication;
  readonly nom: NomDElement;
  readonly reference: ReferenceDElement | undefined;
  readonly libelle: LibelleDElement | undefined;
}

export class ElementDeFabrication {
  readonly type: TypeDElementDeFabrication;
  readonly nom: NomDElement;
  readonly reference: ReferenceDElement | undefined;
  readonly libelle: LibelleDElement | undefined;

  constructor(
    readonly id: ElementDeFabricationId,
    fiche: FicheDElement,
  ) {
    this.type = fiche.type;
    this.nom = fiche.nom;
    this.reference = fiche.reference;
    this.libelle = fiche.libelle;
  }

  numero(): string {
    return this.reference?.value ?? this.nom.value;
  }
}
