import { InstantDeReleve } from './InstantDeReleve';

export interface PauseSansReprise {
  readonly debut: InstantDeReleve;
  readonly fin: undefined;
}

const estSansBorne = (debut: InstantDeReleve | undefined, fin: InstantDeReleve | undefined): boolean =>
  debut === undefined && fin === undefined;

const finitAvantDeCommencer = (debut: InstantDeReleve | undefined, fin: InstantDeReleve | undefined): boolean =>
  debut !== undefined && fin?.estAvant(debut) === true;

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
