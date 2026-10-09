import { DureePassee } from './DureePassee';

export class TempsPasse {
  constructor(
    readonly travail: DureePassee,
    readonly nonConformite: DureePassee,
    readonly total: DureePassee,
  ) {}

  porteUneNonConformite(): boolean {
    return !this.nonConformite.estNulle();
  }
}
