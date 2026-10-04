import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable, signal } from '@angular/core';
import { ApplicationActePort, PrevisualisationConflitPort, ResultatApercu, ResultatApplication } from '../domain/acte/ConflitsActesPorts';
import { PropositionResolution, ResolutionDuConflit } from '../domain/acte/ResolutionDuConflit';
import { ChangementSaisie, SaisieActe } from '../domain/acte/SaisieActe';
import { DossierConflit } from '../domain/dossier/DossierConflit';

export type EtatPreparationActe =
  | { readonly kind: 'REPOS' | 'PREVISUALISATION' | 'CONFIRMATION' | 'CONCURRENCE' | 'ISSUE_INCONNUE' | 'ERREUR' }
  | { readonly kind: 'REFUS' | 'LIMITATION'; readonly raison: string }
  | { readonly kind: 'APPLIQUE'; readonly dossier: DossierConflit };

@Injectable()
export class PreparationActe {
  private readonly previsualisation = inject(PrevisualisationConflitPort);
  private readonly application = inject(ApplicationActePort);
  private readonly erreurs = inject(ErrorHandlerPort);
  private readonly actuelle = signal(ResolutionDuConflit.prepare(SaisieActe.empty()));
  private readonly operationActuelle = signal<EtatPreparationActe>({ kind: 'REPOS' });
  readonly resolution = this.actuelle.asReadonly();
  readonly operation = this.operationActuelle.asReadonly();
  private demande = Symbol('demande');
  private propositionEnAttente: PropositionResolution | undefined;

  choose(saisie: SaisieActe): void {
    if (this.confirmationOutcomeIsPending()) return;
    this.demande = Symbol('choix');
    this.operationActuelle.set({ kind: 'REPOS' });
    this.actuelle.set(ResolutionDuConflit.prepare(saisie));
  }

  private confirmationOutcomeIsPending(): boolean {
    return this.operationActuelle().kind === 'CONFIRMATION' || this.operationActuelle().kind === 'ISSUE_INCONNUE';
  }

  change(changement: ChangementSaisie): void {
    if (this.operationActuelle().kind === 'CONFIRMATION') return;
    this.demande = Symbol('édition');
    if (this.operationActuelle().kind !== 'ISSUE_INCONNUE') this.operationActuelle.set({ kind: 'REPOS' });
    this.actuelle.update(resolution => resolution.afterChange(changement));
  }

  reset(): void {
    this.demande = Symbol('réinitialisation');
    this.actuelle.set(ResolutionDuConflit.prepare(SaisieActe.empty()));
    this.operationActuelle.set({ kind: 'REPOS' });
    this.propositionEnAttente = undefined;
  }

  contextChanged(): void {
    this.reset();
  }

  async verify(): Promise<void> {
    const proposition = this.propositionEnAttente;
    if (proposition === undefined) return;
    const demande = this.demande;
    try {
      const resultat = await this.application.verify(proposition);
      if (this.demande !== demande) return;
      if (resultat.kind === 'ATTESTE') {
        this.showApplicationResult({ kind: 'APPLIQUE', dossier: resultat.dossier });
        this.actuelle.set(ResolutionDuConflit.prepare(SaisieActe.empty()));
      }
    } catch (failure: unknown) {
      this.erreurs.handleError(failure);
    }
  }

  async preview(dossier: DossierConflit): Promise<void> {
    if (this.confirmationOutcomeIsPending()) return;
    const saisie = this.actuelle().saisie;
    const acte = saisie.command();
    if (acte === undefined) return;
    this.actuelle.set(ResolutionDuConflit.prepare(saisie));
    this.operationActuelle.set({ kind: 'PREVISUALISATION' });
    const demande = Symbol('prévisualisation');
    this.demande = demande;
    try {
      const resultat = await this.previsualisation.preview(dossier.ligne.adresse, dossier.version, acte);
      if (this.demande !== demande) return;
      this.showPreviewResult(saisie, resultat, dossier);
    } catch (failure: unknown) {
      this.erreurs.handleError(failure);
      if (this.demande !== demande) return;
      this.operationActuelle.set({ kind: 'ERREUR' });
    }
  }

  private showPreviewResult(saisie: SaisieActe, resultat: ResultatApercu, dossier: DossierConflit): void {
    if (resultat.kind === 'APERCU') {
      this.actuelle.update(resolution => resolution.afterPreview(saisie, resultat.apercu, dossier));
      this.operationActuelle.set({ kind: this.actuelle().confirmation() === undefined ? 'ERREUR' : 'REPOS' });
      return;
    }
    this.operationActuelle.set(resultat);
  }

  async confirm(): Promise<void> {
    if (this.operationActuelle().kind === 'CONFIRMATION') return;
    const apercu = this.actuelle().confirmation();
    if (apercu === undefined) return;
    await this.confirmProposition(apercu);
  }

  async retryConfirmation(): Promise<void> {
    const proposition = this.propositionEnAttente;
    if (proposition === undefined) return;
    if (this.operationActuelle().kind !== 'ISSUE_INCONNUE') return;
    await this.confirmProposition(proposition);
  }

  private async confirmProposition(apercu: PropositionResolution): Promise<void> {
    this.propositionEnAttente = apercu;
    this.operationActuelle.set({ kind: 'CONFIRMATION' });
    const demande = Symbol('confirmation');
    this.demande = demande;
    try {
      const resultat = await this.application.apply(apercu);
      if (this.demande !== demande) return;
      this.showApplicationResult(resultat);
    } catch (failure: unknown) {
      this.erreurs.handleError(failure);
      if (this.demande !== demande) return;
      this.showApplicationResult({ kind: 'ISSUE_INCONNUE' });
    }
  }

  private showApplicationResult(resultat: ResultatApplication): void {
    if (this.shouldInvalidatePreview(resultat)) {
      this.actuelle.update(resolution => ResolutionDuConflit.prepare(resolution.saisie));
    }
    this.operationActuelle.set(resultat.kind === 'ECHEC_CERTAIN' ? { kind: 'ERREUR' } : resultat);
  }

  private shouldInvalidatePreview(resultat: ResultatApplication): boolean {
    return resultat.kind === 'APPLIQUE' || resultat.kind === 'ISSUE_INCONNUE' || resultat.kind === 'CONCURRENCE';
  }
}
