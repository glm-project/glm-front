import { ActiviteAnomalie } from '../dossier/DossierAnomalie';

export interface BornesDuFait {
  readonly min?: string;
  readonly max: string;
}

export class CadreDuFait {
  private constructor(
    private readonly debuts: ReadonlyMap<string, string>,
    private readonly maintenant: string,
  ) {}

  static depuis(activites: readonly ActiviteAnomalie[], maintenant: string): CadreDuFait {
    const debuts = new Map<string, string>();
    for (const activite of activites) {
      if (activite.periode !== undefined) debuts.set(activite.id.activite, activite.periode.debut);
    }
    return new CadreDuFait(debuts, maintenant);
  }

  bornes(fait: { readonly activiteVisee: string }): BornesDuFait {
    const min = this.debuts.get(fait.activiteVisee);
    return min === undefined ? { max: this.maintenant } : { min, max: this.maintenant };
  }
}
