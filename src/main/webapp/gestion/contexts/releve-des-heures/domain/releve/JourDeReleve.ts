import { TotalDeDuree } from '../duree/TotalDeDuree';
import { ElementReleveId } from '../element/ElementReleveId';
import { IntervalleDActivite } from '../element/IntervalleDActivite';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { PointageDElement } from './PointageDElement';

export interface FicheDuJour {
  readonly jour: JourCalendaire;
  readonly operationnelTotal: TotalDeDuree;
  readonly intervalles: readonly IntervalleDActivite[];
  readonly pointages: readonly PointageDElement[];
}

export class JourDeReleve {
  readonly jour: JourCalendaire;
  readonly operationnelTotal: TotalDeDuree;
  readonly intervalles: readonly IntervalleDActivite[];
  readonly pointages: readonly PointageDElement[];

  constructor(fiche: FicheDuJour) {
    this.jour = fiche.jour;
    this.operationnelTotal = fiche.operationnelTotal;
    this.intervalles = [...fiche.intervalles];
    this.pointages = [...fiche.pointages];
  }

  aDesPointages(): boolean {
    return this.pointages.length > 0;
  }

  estVide(): boolean {
    return this.pointages.length === 0 && this.intervalles.length === 0;
  }

  pointagesDe(element: ElementReleveId): readonly PointageDElement[] {
    return this.pointages.filter(pointage => pointage.cible.element.estLeMeme(element));
  }

  intervallesDe(element: ElementReleveId): readonly IntervalleDActivite[] {
    return this.intervalles.filter(intervalle => intervalle.element.estLeMeme(element));
  }
}
