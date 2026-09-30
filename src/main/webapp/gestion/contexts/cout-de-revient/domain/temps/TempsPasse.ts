import { TotalDeTemps } from './TotalDeTemps';

export class TempsPasse {
  constructor(
    readonly travail: TotalDeTemps,
    readonly nonConformite: TotalDeTemps,
    readonly total: TotalDeTemps,
  ) {}

  porteUneNonConformite(): boolean {
    return !this.nonConformite.estNul();
  }
}
