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

  /**
   * Les pauses du jour, dans l'ordre des heures. Une pause va d'une `PAUSE` au pointage suivant du jour, reprise ou
   * départ ; elle vient de la veille quand le jour commence en pause, et reste sans reprise quand il y finit.
   */
  pauses(): readonly PauseDeReleve[] {
    const entrePointages = this.pointages.flatMap((pointage, rang) =>
      pointage.type === 'PAUSE' ? [new PauseDeReleve(pointage.instant, this.pointages[rang + 1]?.instant)] : [],
    );
    return [...this.pauseDepuisLaVeille(), ...entrePointages];
  }

  /** Rien à cet instant quand aucun pointage n'y a eu lieu : minuit, ou une fin présumée posée sur un pointage d'OF. */
  typeDuPointageA(instant: InstantDeReleve): TypeDePointage | undefined {
    return this.pointages.find(pointage => pointage.instant.estLeMeme(instant))?.type;
  }

  /**
   * Un jour commence en pause quand son premier pointage la termine : une reprise, ou un départ qu'aucune plage ne
   * termine, puisque le back permet de partir pendant une pause.
   */
  private pauseDepuisLaVeille(): readonly PauseDeReleve[] {
    const premier = this.pointages[0];
    if (premier === undefined) {
      return [];
    }
    return this.commenceEnPause(premier) ? [new PauseDeReleve(undefined, premier.instant)] : [];
  }

  private commenceEnPause(premier: PointageDeReleve): boolean {
    return premier.type === 'REPRISE' || (premier.type === 'DEPART' && !this.unePlageFinitA(premier));
  }

  private unePlageFinitA(pointage: PointageDeReleve): boolean {
    return this.plages.some(plage => plage.fin?.estLeMeme(pointage.instant) === true);
  }
}
