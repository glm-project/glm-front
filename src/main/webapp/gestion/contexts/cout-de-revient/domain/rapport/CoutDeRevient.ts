import { ElementChiffre } from '../element/ElementChiffre';
import { Cout } from '../montant/Cout';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { ActivitesEnCoursExclues } from './ActivitesEnCoursExclues';
import { LigneDeCout } from './LigneDeCout';
import { SequenceEnConflit } from './SequenceEnConflit';

export interface FicheDuRapport {
  readonly evaluation: InstantDeTravail;
  readonly activitesEnCours: ActivitesEnCoursExclues;
  readonly conflits: readonly SequenceEnConflit[];
  readonly lignes: readonly LigneDeCout[];
  readonly temps: TempsPasse;
  readonly cout: Cout;
}

export class CoutDeRevient {
  readonly evaluation: InstantDeTravail;
  readonly activitesEnCours: ActivitesEnCoursExclues;
  readonly conflits: readonly SequenceEnConflit[];
  readonly lignes: readonly LigneDeCout[];
  readonly temps: TempsPasse;
  readonly cout: Cout;

  constructor(
    readonly element: ElementChiffre,
    fiche: FicheDuRapport,
  ) {
    this.evaluation = fiche.evaluation;
    this.activitesEnCours = fiche.activitesEnCours;
    this.conflits = [...fiche.conflits];
    this.lignes = [...fiche.lignes];
    this.temps = fiche.temps;
    this.cout = fiche.cout;
  }

  estSansTravail(): boolean {
    return this.lignes.length === 0 && !this.activitesEnCours.existent() && this.conflits.length === 0;
  }
}
