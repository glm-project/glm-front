import { inject, Injectable, signal } from '@angular/core';
import { CorrectionsPort, MotifDeChangementDePoste } from '../domain/correction/CorrectionsPort';
import { SaisieDeChangementDePoste } from '../domain/correction/SaisieDeChangementDePoste';
import { SaisieDeRetrait } from '../domain/correction/SaisieDeRetrait';
import { ActiviteTerminee } from '../domain/journee/ActiviteDeLaJournee';
import { PosteDeLaJournee } from '../domain/journee/PosteDeLaJournee';

export type IssueDeCorrection = 'ENREGISTREE' | 'JOURNEE_CHANGEE';

export type EtatDeCorrection =
  | { readonly kind: 'REPOS' | 'EN_COURS' | 'ECHEC' }
  | { readonly kind: 'A_RELIRE'; readonly issue: IssueDeCorrection }
  | { readonly kind: 'REFUSEE'; readonly motif: MotifDeChangementDePoste };

@Injectable()
export class CorrectionDUneActivite {
  private readonly port = inject(CorrectionsPort);
  private saisieDeRetrait: SaisieDeRetrait | undefined;
  private saisieDeChangement: SaisieDeChangementDePoste | undefined;
  private readonly etatCourant = signal<EtatDeCorrection>({ kind: 'REPOS' });
  readonly etat = this.etatCourant.asReadonly();

  async retirer(activite: ActiviteTerminee): Promise<void> {
    await this.corriger(() => this.envoyerLeRetrait(activite));
  }

  async changerDePoste(activite: ActiviteTerminee, poste: PosteDeLaJournee): Promise<void> {
    await this.corriger(() => this.envoyerLeChangement(activite, poste));
  }

  abandonnerLeChangementDePoste(): void {
    this.saisieDeChangement = undefined;
  }

  private async corriger(envoi: () => Promise<EtatDeCorrection>): Promise<void> {
    if (this.etatCourant().kind === 'EN_COURS') {
      return;
    }
    this.etatCourant.set({ kind: 'EN_COURS' });
    this.etatCourant.set(await this.sansEchec(envoi));
  }

  private async sansEchec(envoi: () => Promise<EtatDeCorrection>): Promise<EtatDeCorrection> {
    try {
      return await envoi();
    } catch {
      return { kind: 'ECHEC' };
    }
  }

  private async envoyerLeRetrait(activite: ActiviteTerminee): Promise<EtatDeCorrection> {
    this.saisieDeRetrait = SaisieDeRetrait.pour(this.saisieDeRetrait, activite, () => crypto.randomUUID());
    const resultat = await this.port.retirer(this.saisieDeRetrait);
    this.saisieDeRetrait = undefined;
    return { kind: 'A_RELIRE', issue: resultat.kind };
  }

  private async envoyerLeChangement(activite: ActiviteTerminee, poste: PosteDeLaJournee): Promise<EtatDeCorrection> {
    this.saisieDeChangement = SaisieDeChangementDePoste.pour(this.saisieDeChangement, activite, poste, () => crypto.randomUUID());
    const resultat = await this.port.changerDePoste(this.saisieDeChangement);
    if (resultat.kind === 'REFUS') {
      return { kind: 'REFUSEE', motif: resultat.motif };
    }
    this.saisieDeChangement = undefined;
    return { kind: 'A_RELIRE', issue: resultat.kind };
  }
}
