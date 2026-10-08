export class CategorieDElementChiffre {
  readonly value: string;

  constructor(value: string) {
    if (value.trim().length === 0) {
      throw new Error('La catégorie de l’élément reçue du serveur est vide.');
    }
    this.value = value.trim();
  }
}
