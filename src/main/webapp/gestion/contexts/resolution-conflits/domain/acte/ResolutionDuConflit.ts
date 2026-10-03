import { AdresseDossier, DossierConflit } from '../dossier/DossierConflit';
import { ApercuConflit } from './ConflitsActesPorts';
import { SaisieActe } from './SaisieActe';

export interface ReferenceApercu {
  readonly version: number;
  readonly reference: string;
}

export class ResolutionDuConflit {
  private constructor(
    readonly saisie: SaisieActe,
    readonly apercu?: ApercuConflit,
  ) {}

  static prepare(saisie: SaisieActe): ResolutionDuConflit {
    return new ResolutionDuConflit(saisie);
  }

  afterPreview(saisie: SaisieActe, apercu: ApercuConflit, dossier: DossierConflit = apercu.avant): ResolutionDuConflit {
    if (!this.isCurrentProposition(saisie, apercu, dossier)) {
      return this;
    }
    return new ResolutionDuConflit(this.saisie, apercu);
  }

  private isCurrentProposition(saisie: SaisieActe, apercu: ApercuConflit, dossier: DossierConflit): boolean {
    return (
      saisie === this.saisie
      && saisie.matches(apercu.acte)
      && apercu.version === apercu.avant.version
      && apercu.version === dossier.version
      && this.isPreviewForDossier(apercu, dossier)
    );
  }

  private isPreviewForDossier(apercu: ApercuConflit, dossier: DossierConflit): boolean {
    const adresse = dossier.ligne.adresse;
    return this.sameAddress(apercu.adresse, adresse) && this.sameAddress(apercu.avant.ligne.adresse, adresse);
  }

  private sameAddress(left: AdresseDossier, right: AdresseDossier): boolean {
    return left.suivi.equals(right.suivi) && left.pointage.equals(right.pointage);
  }

  afterChange(changement: Parameters<SaisieActe['afterChange']>[0]): ResolutionDuConflit {
    return new ResolutionDuConflit(this.saisie.afterChange(changement));
  }

  confirmation(): ReferenceApercu | undefined {
    return this.apercu;
  }
}
