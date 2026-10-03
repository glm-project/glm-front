import { InstantPointage } from '../acte/InstantPointage';
import { PointageConflit } from './DossierConflit';

export class ChronologiePointages {
  readonly pointages: readonly PointageConflit[];

  constructor(journal: readonly PointageConflit[]) {
    this.pointages = [...journal].sort((left, right) =>
      new InstantPointage(left.fait.instant).compareTo(new InstantPointage(right.fait.instant)),
    );
  }
}
