import { CategorieDElement } from './CategorieDElement';
import { ElementDeLaJourneeId } from './ElementDeLaJourneeId';

export interface FicheDElementDeLaJournee {
  readonly id: ElementDeLaJourneeId;
  readonly categorie: CategorieDElement;
  readonly nom: string;
  readonly reference: string | undefined;
  readonly description: string | undefined;
}

export class ElementDeLaJournee {
  readonly id: ElementDeLaJourneeId;
  readonly categorie: CategorieDElement;
  readonly nom: string;
  readonly reference: string | undefined;
  readonly description: string | undefined;

  constructor(fiche: FicheDElementDeLaJournee) {
    this.id = fiche.id;
    this.categorie = fiche.categorie;
    this.nom = fiche.nom;
    this.reference = fiche.reference;
    this.description = fiche.description;
  }

  numero(): string {
    return this.reference ?? this.nom;
  }
}
