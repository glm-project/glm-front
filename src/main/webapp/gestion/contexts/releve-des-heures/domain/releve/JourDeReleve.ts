import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDeReleve } from './PointageDeReleve';

export interface FicheDuJour {
  readonly jour: JourCalendaire;
  readonly operationnelPointe: DureeTravaillee;
  readonly operationnelPresume: DureeTravaillee;
  readonly pointages: readonly PointageDeReleve[];
  readonly plages: readonly PlageDeReleve[];
}

export class JourDeReleve {
  readonly jour: JourCalendaire;
  readonly operationnelPointe: DureeTravaillee;
  readonly operationnelPresume: DureeTravaillee;
  readonly pointages: readonly PointageDeReleve[];
  readonly plages: readonly PlageDeReleve[];

  constructor(fiche: FicheDuJour) {
    this.jour = fiche.jour;
    this.operationnelPointe = fiche.operationnelPointe;
    this.operationnelPresume = fiche.operationnelPresume;
    this.pointages = [...fiche.pointages];
    this.plages = [...fiche.plages];
  }

  estVide(): boolean {
    return this.pointages.length === 0 && this.plages.length === 0;
  }

  vientDeLaVeille(plage: PlageDeReleve): boolean {
    return !this.pointages.some(pointage => pointage.instant.estLeMeme(plage.debut));
  }
}
