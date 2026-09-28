import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { InstantDeReleve } from './InstantDeReleve';
import { PauseDeReleve } from './PauseDeReleve';
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
  readonly #pauses: readonly PauseDeReleve[];

  constructor(fiche: FicheDuJour) {
    this.jour = fiche.jour;
    this.dureePointee = fiche.dureePointee;
    this.dureePresumee = fiche.dureePresumee;
    this.pointages = [...fiche.pointages];
    this.plages = [...fiche.plages];
    this.#pauses = this.pauseDepuisLaVeille();
  }

  estVide(): boolean {
    return this.pointages.length === 0 && this.plages.length === 0;
  }

  pauses(): readonly PauseDeReleve[] {
    return this.#pauses;
  }

  vientDeLaVeille(plage: PlageDeReleve): boolean {
    return this.typeDuPointageA(plage.debut) === undefined;
  }

  typeDuPointageA(instant: InstantDeReleve): TypeDePointage | undefined {
    return this.pointages.find(pointage => pointage.instant.estLeMeme(instant))?.type;
  }

  private pauseDepuisLaVeille(): readonly PauseDeReleve[] {
    const premier = this.pointages[0];
    if (premier === undefined) {
      return [];
    }
    return this.commenceEnPause(premier) ? [new PauseDeReleve(premier.instant)] : [];
  }

  private commenceEnPause(premier: PointageDeReleve): boolean {
    return premier.type === 'DEPART' && !this.unePlageFinitA(premier);
  }

  private unePlageFinitA(pointage: PointageDeReleve): boolean {
    return this.plages.some(plage => plage.fin?.estLeMeme(pointage.instant) === true);
  }
}
