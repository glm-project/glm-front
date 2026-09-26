import { InstantDeReleve } from './InstantDeReleve';

const estPresumeeSansFin = (fin: InstantDeReleve | undefined, presumee: boolean): boolean => presumee && fin === undefined;

const finitAvantDeCommencer = (debut: InstantDeReleve, fin: InstantDeReleve | undefined): boolean => fin?.estAvant(debut) === true;

/**
 * Une fenêtre de présence hors pause, lue dans la feuille de temps et déjà ramenée au jour qui la porte. `fin`
 * manque quand l'opérateur est encore là ; une plage présumée est la fin d'une journée de travail abandonnée
 * au-delà de l'amplitude maximale.
 *
 * Ce n'est pas une durée : aucun chiffre du relevé n'en est dérivé. Les durées pointée et présumée restent celles
 * que le serveur a calculées. Ces plages ne servent qu'à dessiner la présence.
 */
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

  estOuverte(): boolean {
    return this.fin === undefined;
  }
}
