export class CategorieDElement {
  readonly value: string;

  constructor(value: string) {
    if (value.trim().length === 0) {
      throw new Error('La catégorie de l’élément travaillé ne peut pas être vide.');
    }
    this.value = value.trim();
  }
}
