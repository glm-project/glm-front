export class CategorieDeProduit {
  readonly value: string;

  constructor(value: string) {
    if (value.trim().length === 0) {
      throw new Error('La catégorie de produit ne peut pas être vide.');
    }
    this.value = value.trim();
  }

  estLaMeme(autre: CategorieDeProduit): boolean {
    return this.value === autre.value;
  }
}
