import { DossierAnomalie } from '../dossier/DossierAnomalie';
import { InstantPointage } from '../dossier/InstantPointage';

export interface BornesDeLaFin {
  readonly min: string;
  readonly max: string;
}

export class CadreDeLaFin {
  private constructor(
    private readonly debut: InstantPointage,
    private readonly plafond: string,
  ) {}

  static depuis(dossier: Pick<DossierAnomalie, 'activite' | 'borneDeFin'>, maintenant: string): CadreDeLaFin {
    const borne = dossier.borneDeFin;
    const plafond = borne !== undefined && new InstantPointage(borne).compareTo(new InstantPointage(maintenant)) < 0 ? borne : maintenant;
    return new CadreDeLaFin(new InstantPointage(dossier.activite.debut), plafond);
  }

  bornes(): BornesDeLaFin {
    return { min: new Date(this.debut.firstWholeMinuteAfter()).toISOString(), max: this.plafond };
  }
}
