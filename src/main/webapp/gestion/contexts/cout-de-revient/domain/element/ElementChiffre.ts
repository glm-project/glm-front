import { TypeDElementChiffre } from './TypeDElementChiffre';

export class ElementChiffre {
  constructor(
    readonly nom: string,
    readonly type: TypeDElementChiffre,
  ) {
    if (nom.trim() === '') {
      throw new Error('Le nom de l’élément reçu du serveur est vide.');
    }
  }
}
