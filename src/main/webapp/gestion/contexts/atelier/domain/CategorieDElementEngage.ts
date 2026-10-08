export class CategorieDElementEngage {
  readonly value: string;

  constructor(value: string) {
    if (value.trim().length === 0) {
      throw new Error('La catégorie copiée à l’engagement ne peut pas être vide.');
    }
    this.value = value.trim();
  }
}
