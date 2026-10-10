import { ElementChiffre } from '../element/ElementChiffre';
import { Cout } from '../montant/Cout';
import { PointageDeCout } from '../pointage/PointageDeCout';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { ActivitesEnCoursExclues } from './ActivitesEnCoursExclues';
import { LigneDeCout } from './LigneDeCout';

export interface FicheDuRapport {
  readonly evaluation: InstantDeTravail;
  readonly activitesEnCours: ActivitesEnCoursExclues;
  readonly lignes: readonly LigneDeCout[];
  readonly temps: TempsPasse;
  readonly cout: Cout;
}

export class CoutDeRevient {
  readonly evaluation: InstantDeTravail;
  readonly activitesEnCours: ActivitesEnCoursExclues;
  readonly lignes: readonly LigneDeCout[];
  readonly temps: TempsPasse;
  readonly cout: Cout;

  constructor(
    readonly element: ElementChiffre,
    fiche: FicheDuRapport,
  ) {
    this.evaluation = fiche.evaluation;
    this.activitesEnCours = fiche.activitesEnCours;
    this.lignes = [...fiche.lignes];
    this.temps = fiche.temps;
    this.cout = fiche.cout;
  }

  estSansTravail(): boolean {
    return this.lignes.length === 0 && !this.activitesEnCours.existent();
  }

  finsAutomatiques(): number {
    return this.pointages().filter(pointage => pointage.porte('FIN_AUTOMATIQUE')).length;
  }

  tarifsManquants(): number {
    return this.pointages().filter(pointage => pointage.manqueUnTarif()).length;
  }

  estExportable(): boolean {
    return this.finsAutomatiques() === 0 && this.tarifsManquants() === 0;
  }

  private pointages(): readonly PointageDeCout[] {
    return this.lignes.flatMap(ligne => ligne.pointages);
  }

  lignesEnAnomalie(): readonly LigneDeCout[] {
    return this.lignes.filter(ligne => ligne.porteDesAnomalies());
  }
}
