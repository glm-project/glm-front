import { InstantDeReleve } from './InstantDeReleve';

/** Ce qu'une pause sans reprise garantit : sans fin, elle a forcément un début. */
export interface PauseSansReprise {
  readonly debut: InstantDeReleve;
  readonly fin: undefined;
}

const estSansBorne = (debut: InstantDeReleve | undefined, fin: InstantDeReleve | undefined): boolean =>
  debut === undefined && fin === undefined;

const finitAvantDeCommencer = (debut: InstantDeReleve | undefined, fin: InstantDeReleve | undefined): boolean =>
  debut !== undefined && fin?.estAvant(debut) === true;

/**
 * Une pause lue dans les pointages d'un jour, d'une `PAUSE` au pointage qui la termine. `debut` manque quand elle
 * vient de la veille, `fin` quand elle n'est pas reprise ce jour-là : sans fuseau, le front ne sait pas construire
 * l'instant de minuit, et l'absence le dit.
 */
export class PauseDeReleve {
  constructor(
    readonly debut: InstantDeReleve | undefined,
    readonly fin: InstantDeReleve | undefined,
  ) {
    if (estSansBorne(debut, fin)) {
      throw new Error('Une pause a au moins un début ou une fin.');
    }
    if (finitAvantDeCommencer(debut, fin)) {
      throw new Error('La pause reçue du serveur finit avant de commencer.');
    }
  }

  estSansReprise(): this is PauseSansReprise {
    return this.fin === undefined;
  }
}
