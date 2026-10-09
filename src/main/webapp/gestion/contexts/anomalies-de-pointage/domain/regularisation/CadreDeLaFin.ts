import { DossierAnomalie } from '../dossier/DossierAnomalie';
import { InstantPointage } from '../dossier/InstantPointage';

export interface BornesDeLaFin {
  readonly min: string;
  readonly max: string;
}

export class CadreDeLaFin {
  private constructor(
    private readonly debut: InstantPointage,
    private readonly plafond: number,
  ) {}

  static depuis(dossier: Pick<DossierAnomalie, 'activite' | 'borneDeFin'>, maintenant: string): CadreDeLaFin {
    const instants = [maintenant, ...(dossier.borneDeFin === undefined ? [] : [dossier.borneDeFin])];
    return new CadreDeLaFin(new InstantPointage(dossier.activite.debut), Math.min(...instants.map(instant => Date.parse(instant))));
  }

  bornes(): BornesDeLaFin {
    return { min: new Date(this.debut.firstWholeMinuteAfter()).toISOString(), max: new Date(this.plafond).toISOString() };
  }
}
