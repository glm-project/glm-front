import { InstantPointage } from '../acte/InstantPointage';
import { PointageAnomalie } from './DossierAnomalie';

export class ChronologiePointages {
  readonly pointages: readonly PointageAnomalie[];

  constructor(journal: readonly PointageAnomalie[]) {
    this.pointages = [...journal].sort((left, right) =>
      new InstantPointage(left.fait.instant).compareTo(new InstantPointage(right.fait.instant)),
    );
  }
}
