export class NomDElement {
  readonly value: string;

  constructor(value: string) {
    if (value.trim().length === 0) {
      throw new Error('Le nom produit par le domaine est obligatoire.');
    }
    this.value = value.trim();
  }
}
