import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ElementReleveId } from '../element/ElementReleveId';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDeReleve } from './PointageDeReleve';

export interface FicheDuJour {
  readonly jour: JourCalendaire;
  readonly operationnelPointe: DureeTravaillee;
  readonly operationnelPresume: DureeTravaillee;
  readonly intervalles: readonly IntervalleDActivite[];
  readonly pointages: readonly PointageDeReleve[];
  readonly plages: readonly PlageDeReleve[];
}

export class JourDeReleve {
  readonly jour: JourCalendaire;
  readonly operationnelPointe: DureeTravaillee;
  readonly operationnelPresume: DureeTravaillee;
  readonly intervalles: readonly IntervalleDActivite[];
  readonly pointages: readonly PointageDeReleve[];
  readonly plages: readonly PlageDeReleve[];

  constructor(fiche: FicheDuJour) {
    this.jour = fiche.jour;
    this.operationnelPointe = fiche.operationnelPointe;
    this.operationnelPresume = fiche.operationnelPresume;
    this.intervalles = [...fiche.intervalles];
    this.pointages = [...fiche.pointages];
    this.plages = [...fiche.plages];
  }

  estVide(): boolean {
    return this.pointages.length === 0 && this.plages.length === 0;
  }

  intervallesDe(element: ElementReleveId): readonly IntervalleDActivite[] {
    return this.intervalles.filter(intervalle => intervalle.element.value === element.value);
  }

  vientDeLaVeille(plage: PlageDeReleve): boolean {
    return !this.pointages.some(pointage => pointage.instant.estLeMeme(plage.debut));
  }
}
