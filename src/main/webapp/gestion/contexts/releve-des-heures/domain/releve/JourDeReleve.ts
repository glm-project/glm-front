import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDeReleve } from './PointageDeReleve';

export interface FicheDuJour {
  readonly jour: JourCalendaire;
  readonly dureePointee: DureeTravaillee;
  readonly dureePresumee: DureeTravaillee;
  readonly pointages: readonly PointageDeReleve[];
  readonly plages: readonly PlageDeReleve[];
}

export class JourDeReleve {
  readonly jour: JourCalendaire;
  readonly dureePointee: DureeTravaillee;
  readonly dureePresumee: DureeTravaillee;
  readonly pointages: readonly PointageDeReleve[];
  readonly plages: readonly PlageDeReleve[];

  constructor(fiche: FicheDuJour) {
    this.jour = fiche.jour;
    this.dureePointee = fiche.dureePointee;
    this.dureePresumee = fiche.dureePresumee;
    this.pointages = [...fiche.pointages];
    this.plages = [...fiche.plages];
  }

  /**
   * Un jour vide n'est pas un jour à durée nulle. Une journée de durée nulle a des pointages mais aucune plage ; un
   * jour entièrement couvert par une présence de plus de vingt-quatre heures a une plage mais aucun pointage.
   */
  estVide(): boolean {
    return this.pointages.length === 0 && this.plages.length === 0;
  }
}
