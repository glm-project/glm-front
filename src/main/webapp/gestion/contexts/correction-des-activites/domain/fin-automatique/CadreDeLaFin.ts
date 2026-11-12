import { DossierDeLaFin } from './DossierDeLaFin';
import { InstantDuDossier } from './InstantDuDossier';

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
    private readonly debut: InstantDuDossier,
    private readonly plafond: number,
    private readonly plafonneePar: LimiteDeLaFin['par'],
  ) {}

  static depuis(dossier: Pick<DossierDeLaFin, 'activite' | 'borneDeFin'>, maintenant: string): CadreDeLaFin {
    const horloge = new InstantDuDossier(maintenant).lastWholeMinute();
    const borne = dossier.borneDeFin === undefined ? undefined : new InstantDuDossier(dossier.borneDeFin).lastWholeMinute();
    const plafonneeParLaBorne = borne !== undefined && borne <= horloge;
    return new CadreDeLaFin(
      new InstantDuDossier(dossier.activite.debut),
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
