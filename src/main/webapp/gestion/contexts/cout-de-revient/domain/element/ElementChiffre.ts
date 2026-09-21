import { TypeDElementChiffre } from './TypeDElementChiffre';

/** L'élément que le rapport a résolu au référentiel : son nom et son type, et rien d'autre. */
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
