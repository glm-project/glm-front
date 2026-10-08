import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable, signal } from '@angular/core';
import {
  ApplicationActePort,
  PrevisualisationAnomaliePort,
  RefusActe,
  ResultatApercu,
  ResultatApplication,
} from '../domain/acte/AnomaliesActesPorts';
import { CadreDuFait } from '../domain/acte/CadreDuFait';
import { propositionDe, PropositionResolution, ResolutionDeLAnomalie } from '../domain/acte/ResolutionDeLAnomalie';
import { ChangementSaisie, SaisieActe } from '../domain/acte/SaisieActe';
import { DossierAnomalie } from '../domain/dossier/DossierAnomalie';

export type EtatPreparationActe =
  | {
      readonly kind: 'REPOS' | 'APERCU_EN_ARRIERE_PLAN' | 'CONFIRMATION' | 'CONCURRENCE' | 'ISSUE_INCONNUE' | 'ERREUR';
    }
  | RefusActe
  | { readonly kind: 'APPLIQUE'; readonly dossier: DossierAnomalie; readonly origine: DossierAnomalie };

interface ConfirmationEnAttente {
  readonly proposition: PropositionResolution;
  readonly origine: DossierAnomalie;
}

@Injectable()
export class PreparationActe {
  private readonly previsualisation = inject(PrevisualisationAnomaliePort);
  private readonly application = inject(ApplicationActePort);
  private readonly erreurs = inject(ErrorHandlerPort);
  private readonly actuelle = signal(ResolutionDeLAnomalie.prepare(SaisieActe.empty()));
  private readonly operationActuelle = signal<EtatPreparationActe>({ kind: 'REPOS' });
  readonly resolution = this.actuelle.asReadonly();
  readonly operation = this.operationActuelle.asReadonly();
  private demande = Symbol('demande');
  private confirmationEnAttente: ConfirmationEnAttente | undefined;

  choose(saisie: SaisieActe): void {
    if (this.confirmationOutcomeIsPending()) return;
    this.demande = Symbol('choix');
    this.operationActuelle.set({ kind: 'REPOS' });
    this.actuelle.set(ResolutionDeLAnomalie.prepare(saisie));
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
    this.actuelle.set(ResolutionDeLAnomalie.prepare(SaisieActe.empty()));
    this.operationActuelle.set({ kind: 'REPOS' });
    this.confirmationEnAttente = undefined;
  }

  contextChanged(): void {
    this.reset();
  }

  async verify(): Promise<void> {
    const enAttente = this.confirmationEnAttente;
    if (enAttente === undefined) return;
    const demande = this.demande;
    try {
      const resultat = await this.application.verify(enAttente.proposition);
      if (this.demande !== demande) return;
      if (resultat.kind === 'ATTESTE') {
        this.showApplicationResult({ kind: 'APPLIQUE', dossier: resultat.dossier }, enAttente.origine);
        this.actuelle.set(ResolutionDeLAnomalie.prepare(SaisieActe.empty()));
      }
    } catch (failure: unknown) {
      this.erreurs.handleError(failure);
    }
  }

  async previewInBackground(dossier: DossierAnomalie): Promise<void> {
    if (this.confirmationOutcomeIsPending()) return;
    const saisie = this.actuelle().saisie;
    const acte = saisie.command(CadreDuFait.depuis(dossier.activites, new Date().toISOString()));
    if (acte === undefined) return;
    this.actuelle.set(ResolutionDeLAnomalie.prepare(saisie));
    this.operationActuelle.set({ kind: 'APERCU_EN_ARRIERE_PLAN' });
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

  private showPreviewResult(saisie: SaisieActe, resultat: ResultatApercu, dossier: DossierAnomalie): void {
    if (resultat.kind === 'APERCU') {
      this.actuelle.update(resolution => resolution.afterPreview(saisie, resultat.apercu, dossier));
      this.operationActuelle.set({ kind: this.actuelle().confirmation() === undefined ? 'ERREUR' : 'REPOS' });
      return;
    }
    this.operationActuelle.set(resultat);
  }

  async confirm(): Promise<void> {
    if (this.operationActuelle().kind === 'CONFIRMATION') return;
    const apercu = this.actuelle().apercu;
    if (apercu === undefined) return;
    await this.confirmProposition({ proposition: propositionDe(apercu), origine: apercu.avant });
  }

  async retryConfirmation(): Promise<void> {
    const enAttente = this.confirmationEnAttente;
    if (enAttente === undefined) return;
    if (this.operationActuelle().kind !== 'ISSUE_INCONNUE') return;
    await this.confirmProposition(enAttente);
  }

  private async confirmProposition(enAttente: ConfirmationEnAttente): Promise<void> {
    this.confirmationEnAttente = enAttente;
    this.operationActuelle.set({ kind: 'CONFIRMATION' });
    const demande = Symbol('confirmation');
    this.demande = demande;
    try {
      const resultat = await this.application.apply(enAttente.proposition);
      if (this.demande !== demande) return;
      this.showApplicationResult(resultat, enAttente.origine);
    } catch (failure: unknown) {
      this.erreurs.handleError(failure);
      if (this.demande !== demande) return;
      this.showApplicationResult({ kind: 'ISSUE_INCONNUE' }, enAttente.origine);
    }
  }

  private showApplicationResult(resultat: ResultatApplication, origine: DossierAnomalie): void {
    if (this.shouldInvalidatePreview(resultat)) {
      this.actuelle.update(resolution => ResolutionDeLAnomalie.prepare(resolution.saisie));
    }
    this.operationActuelle.set(resultat.kind === 'APPLIQUE' ? { ...resultat, origine } : resultat);
  }

  private shouldInvalidatePreview(resultat: ResultatApplication): boolean {
    return resultat.kind === 'APPLIQUE' || resultat.kind === 'ISSUE_INCONNUE' || resultat.kind === 'CONCURRENCE';
  }
}
