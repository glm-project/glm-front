import { AdresseDossier, DossierAnomalie } from '../dossier/DossierAnomalie';
import { ActeResolution } from './ActeResolution';
import { ApercuAnomalie } from './AnomaliesActesPorts';
import { SaisieActe } from './SaisieActe';

export interface PropositionResolution {
  readonly adresse: AdresseDossier;
  readonly commande: string;
  readonly version: number;
  readonly acte: ActeResolution;
  readonly empreinteConsequences: string;
  readonly evenement?: string;
}

export const propositionDe = (apercu: ApercuAnomalie): PropositionResolution => ({
  adresse: apercu.adresse,
  commande: apercu.commande,
  version: apercu.version,
  acte: apercu.acte,
  empreinteConsequences: apercu.empreinteConsequences,
  ...(apercu.evenement === undefined ? {} : { evenement: apercu.evenement }),
});

export class ResolutionDeLAnomalie {
  private constructor(
    readonly saisie: SaisieActe,
    readonly apercu?: ApercuAnomalie,
  ) {}

  static prepare(saisie: SaisieActe): ResolutionDeLAnomalie {
    return new ResolutionDeLAnomalie(saisie);
  }

  afterPreview(saisie: SaisieActe, apercu: ApercuAnomalie, dossier: DossierAnomalie = apercu.avant): ResolutionDeLAnomalie {
    if (!this.isCurrentProposition(saisie, apercu, dossier)) {
      return this;
    }
    return new ResolutionDeLAnomalie(this.saisie, apercu);
  }

  private isCurrentProposition(saisie: SaisieActe, apercu: ApercuAnomalie, dossier: DossierAnomalie): boolean {
    return (
      saisie === this.saisie
      && saisie.matches(apercu.acte)
      && (apercu.acte.kind === 'ANNULATION' ? apercu.evenement === undefined : apercu.evenement !== undefined)
      && apercu.evenement !== apercu.commande
      && apercu.version === apercu.avant.version
      && apercu.version === dossier.version
      && this.isPreviewForDossier(apercu, dossier)
    );
  }

  private isPreviewForDossier(apercu: ApercuAnomalie, dossier: DossierAnomalie): boolean {
    const adresse = dossier.ligne.adresse;
    return this.sameAddress(apercu.adresse, adresse) && this.sameAddress(apercu.avant.ligne.adresse, adresse);
  }

  private sameAddress(left: AdresseDossier, right: AdresseDossier): boolean {
    return left.suivi.equals(right.suivi) && left.pointage.equals(right.pointage);
  }

  afterChange(changement: Parameters<SaisieActe['afterChange']>[0]): ResolutionDeLAnomalie {
    return new ResolutionDeLAnomalie(this.saisie.afterChange(changement));
  }

  confirmation(): PropositionResolution | undefined {
    return this.apercu === undefined ? undefined : propositionDe(this.apercu);
  }
}
