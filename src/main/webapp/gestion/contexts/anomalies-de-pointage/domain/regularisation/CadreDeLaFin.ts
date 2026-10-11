import { DossierAnomalie } from '../dossier/DossierAnomalie';
import { InstantPointage } from '../dossier/InstantPointage';

export interface BornesDeLaFin {
  readonly min: string;
  readonly max: string;
}

export interface LimiteDeLaFin {
  readonly par: 'BORNE' | 'HORLOGE';
  readonly instant: string;
}

export class CadreDeLaFin {
  private constructor(
    private readonly debut: InstantPointage,
    private readonly plafond: number,
    private readonly plafonneePar: LimiteDeLaFin['par'],
  ) {}

  static depuis(dossier: Pick<DossierAnomalie, 'activite' | 'borneDeFin'>, maintenant: string): CadreDeLaFin {
    const horloge = new InstantPointage(maintenant).lastWholeMinute();
    const borne = dossier.borneDeFin === undefined ? undefined : new InstantPointage(dossier.borneDeFin).lastWholeMinute();
    const plafonneeParLaBorne = borne !== undefined && borne <= horloge;
    return new CadreDeLaFin(
      new InstantPointage(dossier.activite.debut),
      plafonneeParLaBorne ? borne : horloge,
      plafonneeParLaBorne ? 'BORNE' : 'HORLOGE',
    );
  }

  bornes(): BornesDeLaFin {
    return { min: new Date(this.debut.firstWholeMinuteAfter()).toISOString(), max: new Date(this.plafond).toISOString() };
  }

  limite(): LimiteDeLaFin {
    return { par: this.plafonneePar, instant: new Date(this.plafond).toISOString() };
  }
}
