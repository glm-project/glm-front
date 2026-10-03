import { PointageConflit } from './DossierConflit';

export class ChronologiePointages {
  readonly pointages: readonly PointageConflit[];

  constructor(journal: readonly PointageConflit[]) {
    this.pointages = [...journal].sort((left, right) => compareInstants(left.fait.instant, right.fait.instant));
  }
}

const compareInstants = (left: string, right: string): number =>
  Date.parse(left) - Date.parse(right) || fractionSeconde(left) - fractionSeconde(right);

const fractionSeconde = (instant: string): number => Number(instant.slice(19).replace(/Z|[+-]\d{2}:\d{2}/, ''));
