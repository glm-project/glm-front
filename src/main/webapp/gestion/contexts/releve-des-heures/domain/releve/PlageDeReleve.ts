import { InstantDeReleve } from './InstantDeReleve';

/**
 * Un intervalle lu dans le journal d'un jour : une présence, ou la pause qui la coupe. `fin` manque quand le
 * dernier pointage du jour n'a pas encore été refermé.
 *
 * Ce n'est pas une durée : aucun chiffre du relevé n'en est dérivé. La durée travaillée reste celle que le
 * serveur a calculée. Ces plages ne servent qu'à dessiner ce que le journal raconte.
 */
export class PlageDeReleve {
  constructor(
    readonly debut: InstantDeReleve,
    readonly fin: InstantDeReleve | undefined,
    readonly pause: boolean,
  ) {}

  estOuverte(): boolean {
    return this.fin === undefined;
  }
}
