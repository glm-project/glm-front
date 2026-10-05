import { TotalDeDuree } from './duree/TotalDeDuree';
import { JourCalendaire } from './semaine/JourCalendaire';

export class JourDePointages {
  constructor(
    readonly jour: JourCalendaire,
    readonly total: TotalDeDuree,
    private readonly pointages: number,
  ) {}

  estPointe(): boolean {
    return this.pointages > 0;
  }
}
