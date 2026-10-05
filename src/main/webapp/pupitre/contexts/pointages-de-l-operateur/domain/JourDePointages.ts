import { TotalDeDuree } from './duree/TotalDeDuree';
import { LigneDePointage } from './LigneDePointage';
import { JourCalendaire } from './semaine/JourCalendaire';

export class JourDePointages {
  constructor(
    readonly jour: JourCalendaire,
    readonly total: TotalDeDuree,
    readonly lignes: readonly LigneDePointage[],
  ) {}

  estPointe(): boolean {
    return this.lignes.length > 0;
  }
}
