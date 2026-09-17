import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { PointageDeReleve } from './PointageDeReleve';

export class JourDeReleve {
  readonly pointages: readonly PointageDeReleve[];

  constructor(
    readonly jour: JourCalendaire,
    readonly duree: DureeTravaillee,
    pointages: readonly PointageDeReleve[],
  ) {
    this.pointages = [...pointages];
  }

  /**
   * Un jour vide et un jour à durée nulle sont deux faits différents : quelqu'un qui pointe son arrivée et son
   * départ dans la même minute ne doit pas avoir l'air absent.
   */
  estSansPointage(): boolean {
    return this.pointages.length === 0;
  }
}
