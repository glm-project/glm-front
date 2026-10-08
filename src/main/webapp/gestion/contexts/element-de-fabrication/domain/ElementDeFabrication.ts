import { CategorieDeProduit } from './CategorieDeProduit';
import { ElementDeFabricationId } from './ElementDeFabricationId';
import { LibelleDElement } from './LibelleDElement';
import { NomDElement } from './NomDElement';
import { ReferenceDElement } from './ReferenceDElement';

export interface FicheDElement {
  readonly categorie: CategorieDeProduit;
  readonly nom: NomDElement;
  readonly reference: ReferenceDElement | undefined;
  readonly libelle: LibelleDElement | undefined;
}

export class ElementDeFabrication {
  readonly categorie: CategorieDeProduit;
  readonly nom: NomDElement;
  readonly reference: ReferenceDElement | undefined;
  readonly libelle: LibelleDElement | undefined;

  constructor(
    readonly id: ElementDeFabricationId,
    fiche: FicheDElement,
  ) {
    this.categorie = fiche.categorie;
    this.nom = fiche.nom;
    this.reference = fiche.reference;
    this.libelle = fiche.libelle;
  }

  numero(): string {
    return this.reference?.value ?? this.nom.value;
  }
}
