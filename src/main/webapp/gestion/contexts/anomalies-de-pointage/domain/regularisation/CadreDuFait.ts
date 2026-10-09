import { DossierAnomalie } from '../dossier/DossierAnomalie';
import { InstantPointage } from './InstantPointage';

export interface BornesDuFait {
  readonly min: string;
  readonly max: string;
}

export class CadreDuFait {
  private constructor(
    private readonly debut: InstantPointage,
    private readonly plafond: string,
  ) {}

  static depuis(dossier: Pick<DossierAnomalie, 'activite' | 'borneDeFin'>, maintenant: string): CadreDuFait {
    const borne = dossier.borneDeFin;
    const plafond = borne !== undefined && new InstantPointage(borne).compareTo(new InstantPointage(maintenant)) < 0 ? borne : maintenant;
    return new CadreDuFait(new InstantPointage(dossier.activite.debut), plafond);
  }

  bornes(): BornesDuFait {
    return { min: new Date(this.debut.firstWholeMinuteAfter()).toISOString(), max: this.plafond };
  }
}
