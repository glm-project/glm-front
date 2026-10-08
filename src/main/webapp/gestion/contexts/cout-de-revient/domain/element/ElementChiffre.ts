import { CategorieDElementChiffre } from './CategorieDElementChiffre';

interface DesignationDElement {
  readonly reference?: string | undefined;
  readonly libelle?: string | undefined;
}

export class ElementChiffre {
  readonly reference: string | undefined;
  readonly libelle: string | undefined;
  constructor(
    readonly nom: string,
    readonly categorie: CategorieDElementChiffre,
    designation: DesignationDElement = {},
  ) {
    this.reference = designation.reference;
    this.libelle = designation.libelle;
    if (nom.trim() === '') {
      throw new Error('Le nom de l’élément reçu du serveur est vide.');
    }
  }
  numero(): string {
    return this.reference ?? this.nom;
  }
}
