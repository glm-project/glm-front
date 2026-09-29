import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ElementReleveId } from '../element/ElementReleveId';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { CibleDePointage } from './CibleDePointage';
import { EffetDePointage } from './EffetDePointage';
import { InstantDeReleve } from './InstantDeReleve';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDElement } from './PointageDElement';
import { PointageDePresence } from './PointageDePresence';
import { PointageDeReleve } from './PointageDeReleve';

export interface FicheDuJour {
  readonly jour: JourCalendaire;
  readonly operationnelPointe: DureeTravaillee;
  readonly operationnelPresume: DureeTravaillee;
  readonly intervalles: readonly IntervalleDActivite[];
  readonly pointages: readonly PointageDeReleve[];
  readonly plages: readonly PlageDeReleve[];
}

const estUnDepart = (pointage: PointageDeReleve): pointage is PointageDePresence =>
  pointage instanceof PointageDePresence && pointage.type === 'DEPART';

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

  aDesPointages(): boolean {
    return this.pointages.length > 0;
  }

  estVide(): boolean {
    return this.pointages.length === 0 && this.plages.length === 0;
  }

  pointagesDePresence(): readonly PointageDePresence[] {
    return this.pointages.filter(pointage => pointage instanceof PointageDePresence);
  }

  pointagesDElement(): readonly PointageDElement[] {
    return this.pointages.filter(pointage => pointage instanceof PointageDElement);
  }

  pointagesDe(element: ElementReleveId): readonly PointageDElement[] {
    return this.pointagesDElement().filter(pointage => pointage.cible.element.estLeMeme(element));
  }

  effetDe(pointage: PointageDeReleve): EffetDePointage {
    if (!estUnDepart(pointage)) {
      return new EffetDePointage([]);
    }
    const cibles = this.intervalles
      .filter(intervalle => intervalle.fin?.estLeMeme(pointage.instant) === true)
      .map(intervalle => intervalle.cible())
      .filter(cible => !this.uneFinPointeeTermine(cible, pointage.instant));
    return new EffetDePointage(cibles.filter((cible, rang) => cibles.findIndex(autre => autre.estLaMeme(cible)) === rang));
  }

  estArreteSansFinPointee(intervalle: IntervalleDActivite): boolean {
    const fin = intervalle.fin;
    return (
      fin !== undefined
      && !intervalle.presumee
      && !fin.estUnAutreJourQue(intervalle.debut)
      && ![...this.pointagesDePresence(), ...this.pointagesDe(intervalle.element)].some(pointage => pointage.instant.estLeMeme(fin))
    );
  }

  intervallesDe(element: ElementReleveId): readonly IntervalleDActivite[] {
    return this.intervalles.filter(intervalle => intervalle.element.estLeMeme(element));
  }

  private uneFinPointeeTermine(cible: CibleDePointage, instant: InstantDeReleve): boolean {
    return this.pointagesDElement().some(
      pointage => pointage.type === 'FIN' && pointage.instant.estLeMeme(instant) && pointage.cible.estLaMeme(cible),
    );
  }

  vientDeLaVeille(plage: PlageDeReleve): boolean {
    return !this.pointagesDePresence().some(pointage => pointage.instant.estLeMeme(plage.debut));
  }
}
