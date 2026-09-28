import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { InstantDeReleve } from './InstantDeReleve';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDeReleve } from './PointageDeReleve';
import { TypeDePointage } from './TypeDePointage';

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

  estVide(): boolean {
    return this.pointages.length === 0 && this.plages.length === 0;
  }

  vientDeLaVeille(plage: PlageDeReleve): boolean {
    return this.typeDuPointageA(plage.debut) === undefined;
  }

  typeDuPointageA(instant: InstantDeReleve): TypeDePointage | undefined {
    return this.pointages.find(pointage => pointage.instant.estLeMeme(instant))?.type;
  }
}
