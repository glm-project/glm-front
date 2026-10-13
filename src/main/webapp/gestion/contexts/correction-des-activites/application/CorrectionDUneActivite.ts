import { inject, Injectable, signal } from '@angular/core';
import { ContenuDAjout } from '../domain/correction/ContenuDAjout';
import { CorrectionsPort, MotifDAjout, MotifDeChangementDePoste } from '../domain/correction/CorrectionsPort';
import { SaisieDAjout } from '../domain/correction/SaisieDAjout';
import { SaisieDeChangementDePoste } from '../domain/correction/SaisieDeChangementDePoste';
import { SaisieDeRetrait } from '../domain/correction/SaisieDeRetrait';
import { ActiviteTerminee } from '../domain/journee/ActiviteDeLaJournee';
import { PosteDeLaJournee } from '../domain/journee/PosteDeLaJournee';

export type IssueDeCorrection = 'ENREGISTREE' | 'JOURNEE_CHANGEE';

export type EtatDeCorrection =
  | { readonly kind: 'REPOS' | 'EN_COURS' | 'ECHEC' }
  | { readonly kind: 'A_RELIRE'; readonly issue: IssueDeCorrection }
  | { readonly kind: 'REFUSEE'; readonly motif: MotifDeChangementDePoste }
  | { readonly kind: 'AJOUT_REFUSE'; readonly motif: MotifDAjout };

@Injectable()
export class CorrectionDUneActivite {
  private readonly port = inject(CorrectionsPort);
  private saisieDeRetrait: SaisieDeRetrait | undefined;
  private saisieDeChangement: SaisieDeChangementDePoste | undefined;
  private saisieDAjout: SaisieDAjout | undefined;
  private readonly etatCourant = signal<EtatDeCorrection>({ kind: 'REPOS' });
  readonly etat = this.etatCourant.asReadonly();

  async retirer(activite: ActiviteTerminee): Promise<void> {
    await this.corriger(() => this.envoyerLeRetrait(activite));
  }

  async changerDePoste(activite: ActiviteTerminee, poste: PosteDeLaJournee): Promise<void> {
    await this.corriger(() => this.envoyerLeChangement(activite, poste));
  }

  async ajouter(contenu: ContenuDAjout): Promise<void> {
    await this.corriger(() => this.envoyerLAjout(contenu));
  }

  abandonnerLeChangementDePoste(): void {
    this.saisieDeChangement = undefined;
  }

  abandonnerLAjout(): void {
    this.saisieDAjout = undefined;
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

  private async envoyerLAjout(contenu: ContenuDAjout): Promise<EtatDeCorrection> {
    this.saisieDAjout = SaisieDAjout.pour(this.saisieDAjout, contenu, () => crypto.randomUUID());
    const resultat = await this.port.ajouter(this.saisieDAjout);
    if (resultat.kind === 'REFUS') {
      return { kind: 'AJOUT_REFUSE', motif: resultat.motif };
    }
    this.saisieDAjout = undefined;
    return { kind: 'A_RELIRE', issue: resultat.kind };
  }
}
