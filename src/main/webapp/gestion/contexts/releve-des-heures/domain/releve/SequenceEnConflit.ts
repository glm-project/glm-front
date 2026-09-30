import { ActiviteReleveId } from './ActiviteReleveId';
import { CibleDePointage } from './CibleDePointage';
import { PointageReleveId } from './PointageReleveId';

export class SequenceEnConflit {
  readonly activites: readonly ActiviteReleveId[];
  readonly pointages: readonly PointageReleveId[];

  constructor(
    readonly cible: CibleDePointage,
    activites: readonly ActiviteReleveId[],
    pointages: readonly PointageReleveId[],
  ) {
    this.activites = [...activites];
    this.pointages = [...pointages];
  }
}
