import { InstantDeReleve } from './InstantDeReleve';

const estPresumeeSansFin = (fin: InstantDeReleve | undefined, presumee: boolean): boolean => presumee && fin === undefined;

const finitAvantDeCommencer = (debut: InstantDeReleve, fin: InstantDeReleve | undefined): boolean => fin?.estAvant(debut) === true;

export class PlageDeReleve {
  constructor(
    readonly debut: InstantDeReleve,
    readonly fin: InstantDeReleve | undefined,
    readonly presumee: boolean,
  ) {
    if (estPresumeeSansFin(fin, presumee)) {
      throw new Error('La plage reçue du serveur est présumée sans fin.');
    }
    if (finitAvantDeCommencer(debut, fin)) {
      throw new Error('La plage reçue du serveur finit avant de commencer.');
    }
  }

  estEnCours(): boolean {
    return this.fin === undefined;
  }

  finOuDebut(): InstantDeReleve {
    return this.fin ?? this.debut;
  }
}
