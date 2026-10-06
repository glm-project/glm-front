import { ActiviteAnomalie } from '../dossier/DossierAnomalie';
import { InstantPointage } from './InstantPointage';

export interface BornesDuFait {
  readonly min?: string;
  readonly max: string;
}

export type DepassementDuFait = 'INSTANT_AVANT_CIBLE' | 'INSTANT_FUTUR';

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

  depassements(fait: { readonly activiteVisee: string; readonly instant: string }): readonly DepassementDuFait[] {
    const instant = new InstantPointage(fait.instant);
    const { min, max } = this.bornes(fait);
    const depassements: DepassementDuFait[] = [];
    if (this.precede(instant, min)) depassements.push('INSTANT_AVANT_CIBLE');
    if (instant.compareTo(new InstantPointage(max)) > 0) depassements.push('INSTANT_FUTUR');
    return depassements;
  }

  private precede(instant: InstantPointage, borne: string | undefined): boolean {
    return borne !== undefined && instant.compareTo(new InstantPointage(borne)) < 0;
  }
}
