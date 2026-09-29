import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ElementReleveId } from '../element/ElementReleveId';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { EffetDePointage } from './EffetDePointage';
import { InstantDeReleve } from './InstantDeReleve';
import { PlageDeReleve } from './PlageDeReleve';
import { CibleDePointage, PointageDElement } from './PointageDElement';
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

const memeCible = (une: CibleDePointage, autre: CibleDePointage): boolean =>
  une.element.value === autre.element.value && une.poste?.value === autre.poste?.value;

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
    return this.pointagesDElement().filter(pointage => pointage.cible.element.value === element.value);
  }

  effetDe(pointage: PointageDeReleve): EffetDePointage {
    if (!estUnDepart(pointage)) {
      return { clotures: [] };
    }
    const finies = this.intervalles.filter(intervalle => intervalle.fin?.estLeMeme(pointage.instant) === true);
    const sansFinPointee = finies.filter(cible => !this.uneFinPointeeTermine(cible, pointage.instant));
    const distinctes = sansFinPointee.filter((cible, rang) => sansFinPointee.findIndex(autre => memeCible(autre, cible)) === rang);
    return { clotures: distinctes.map(({ element, poste }) => ({ element, poste })) };
  }

  intervallesDe(element: ElementReleveId): readonly IntervalleDActivite[] {
    return this.intervalles.filter(intervalle => intervalle.element.value === element.value);
  }

  private uneFinPointeeTermine(cible: CibleDePointage, instant: InstantDeReleve): boolean {
    return this.pointagesDElement().some(
      pointage => pointage.type === 'FIN' && pointage.instant.estLeMeme(instant) && memeCible(pointage.cible, cible),
    );
  }

  vientDeLaVeille(plage: PlageDeReleve): boolean {
    return !this.pointages.some(pointage => pointage.instant.estLeMeme(plage.debut));
  }
}
