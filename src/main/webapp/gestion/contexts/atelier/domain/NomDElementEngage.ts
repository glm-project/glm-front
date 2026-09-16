export class NomDElementEngage {
  readonly value: string;

  constructor(value: string) {
    if (value.trim().length === 0) {
      throw new Error('Le nom copié à l’engagement ne peut pas être vide.');
    }
    this.value = value.trim();
  }
}
