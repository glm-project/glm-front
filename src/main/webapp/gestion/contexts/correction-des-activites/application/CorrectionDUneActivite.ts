import { inject, Injectable, signal } from '@angular/core';
import { CorrectionsPort } from '../domain/correction/CorrectionsPort';
import { SaisieDeRetrait } from '../domain/correction/SaisieDeRetrait';
import { ActiviteTerminee } from '../domain/journee/ActiviteDeLaJournee';

export type IssueDeCorrection = 'ENREGISTREE' | 'JOURNEE_CHANGEE';

export type EtatDeCorrection =
  { readonly kind: 'REPOS' | 'EN_COURS' | 'ECHEC' } | { readonly kind: 'A_RELIRE'; readonly issue: IssueDeCorrection };

@Injectable()
export class CorrectionDUneActivite {
  private readonly port = inject(CorrectionsPort);
  private saisie: SaisieDeRetrait | undefined;
  private readonly etatCourant = signal<EtatDeCorrection>({ kind: 'REPOS' });
  readonly etat = this.etatCourant.asReadonly();

  async retirer(activite: ActiviteTerminee): Promise<void> {
    if (this.etatCourant().kind === 'EN_COURS') {
      return;
    }
    this.etatCourant.set({ kind: 'EN_COURS' });
    this.etatCourant.set(await this.envoyer(activite));
  }

  private async envoyer(activite: ActiviteTerminee): Promise<EtatDeCorrection> {
    this.saisie = SaisieDeRetrait.pour(this.saisie, activite, () => crypto.randomUUID());
    try {
      const resultat = await this.port.retirer(this.saisie);
      this.saisie = undefined;
      return { kind: 'A_RELIRE', issue: resultat.kind };
    } catch {
      return { kind: 'ECHEC' };
    }
  }
}
