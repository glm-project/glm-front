import { InstantDAtelier } from './InstantDAtelier';

export class ActeDAtelier {
  readonly auteur: string;

  constructor(
    readonly instant: InstantDAtelier,
    auteur: string,
  ) {
    if (auteur.trim().length === 0) {
      throw new Error('Un acte d’atelier porte toujours son auteur.');
    }
    this.auteur = auteur.trim();
  }
}
