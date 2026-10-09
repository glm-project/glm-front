import { ActiviteEchue } from '../dossier/DossierAnomalie';

export interface BornesDuFait {
  readonly min: string;
  readonly max: string;
}

export class CadreDuFait {
  private constructor(
    private readonly debut: string,
    private readonly maintenant: string,
  ) {}

  static depuis(activite: ActiviteEchue, maintenant: string): CadreDuFait {
    return new CadreDuFait(activite.debut, maintenant);
  }

  bornes(): BornesDuFait {
    return { min: this.debut, max: this.maintenant };
  }
}
