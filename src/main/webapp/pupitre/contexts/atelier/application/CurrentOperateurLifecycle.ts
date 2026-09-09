import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { computed, inject, Injectable, signal } from '@angular/core';
import { DesignationExpirationSchedulerPort } from '../domain/designation/DesignationExpirationSchedulerPort';
import { DesignationOperateur, isFenetreIdentifiedBy } from '../domain/designation/DesignationOperateur';
import { AcceptationDeGestes, FenetreOperateur, IdentiteOperateurDesigne } from '../domain/designation/FenetreOperateur';
import { IdentiteDeFenetre } from '../domain/designation/IdentiteDeFenetre';
import { Matricule } from '../domain/designation/Matricule';
import { MatriculeInconnu } from '../domain/designation/MatriculeInconnu';
import { Entreprise } from '../domain/journal-du-pupitre/Entreprise';
import { JournalDuPupitre } from '../domain/journal-du-pupitre/JournalDuPupitre';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';
import { GestesRecordingQueue } from './GestesRecordingQueue';

@Injectable()
export class CurrentOperateurLifecycle {
  private readonly errorHandler = inject(ErrorHandlerPort);
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);
  private readonly acceptationLocale = inject(GestesRecordingQueue);
  private readonly expirationScheduler = inject(DesignationExpirationSchedulerPort);
  private readonly designation = signal(DesignationOperateur.empty());
  private readonly state = computed(() => this.designation().snapshot());
  private fermeture: Promise<void> | undefined;

  readonly code = computed(() => this.state().code);
  readonly unknownCode = computed(() => this.state().unknownCode);
  readonly operateur = computed(() => this.state().operateur);
  readonly canValidate = computed(() => this.state().canValidate);
  readonly pointage = computed(() => this.designation().visibleWindow()?.pointage());
  readonly refusAtelier = computed(() => this.designation().visibleWindow()?.refusal());
  readonly gestesDisponibles = computed(() => this.designation().window()?.allowsGestures() ?? true);

  registerPress(): boolean {
    const press = this.designation().afterPress(Date.now());
    this.designation.set(press.designation);
    this.refresh();
    return press.accepted;
  }

  enterDigit(digit: string): void {
    this.designation.update(current => current.afterDigit(digit, Date.now()));
    this.refresh();
  }

  erase(): void {
    this.designation.update(current => current.afterErasing(Date.now()));
    this.refresh();
  }

  async validate(): Promise<void> {
    const beginning = this.designation().afterBeginningResolution(Date.now());
    this.designation.set(beginning.designation);
    this.refresh();
    const { resolution } = beginning;
    if (resolution === undefined) return;
    try {
      await this.openWindow(resolution.code);
      const completion = this.designation().afterCompletingResolution(resolution, Date.now());
      this.designation.set(completion.designation);
      if (!completion.accepted) await this.drainWindow();
    } catch (failure: unknown) {
      this.designation.update(current => current.afterFailingResolution(resolution, Date.now()));
      if (failure instanceof MatriculeInconnu) this.pushReferentielFreshness();
    } finally {
      this.designation.update(current => current.afterEndingResolution());
      this.refresh();
    }
  }

  async openWindow(code: Matricule): Promise<IdentiteOperateurDesigne> {
    const { entreprise, state } = await this.etatHorsLigne.openingSource();
    const opening = this.designation().afterOpeningWindow(entreprise, state, code, Date.now());
    this.designation.set(opening.designation);
    this.etatHorsLigne.publish(opening.fenetre.snapshot());
    this.refresh();
    return opening.fenetre.operateur;
  }

  finish(): Promise<void> {
    this.designation.update(current => current.afterFinish());
    return this.settle();
  }

  expire(): Promise<void> {
    this.designation.update(current => current.afterExpiration(Date.now()));
    return this.settle();
  }

  requireWindow(now = Date.now()): FenetreOperateur {
    const access = this.designation().windowAfterPress(now);
    this.designation.set(access.designation);
    this.refresh();
    if (access.fenetre === undefined) throw new Error('Aucune fenetre operateur ouverte.');
    return access.fenetre;
  }

  currentWindow(identity: IdentiteDeFenetre): FenetreOperateur {
    const current = this.designation().window();
    if (!isFenetreIdentifiedBy(current, identity)) throw new Error('La fenetre operateur a change.');
    return current;
  }

  isCurrentWindow(identity: IdentiteDeFenetre): boolean {
    return isFenetreIdentifiedBy(this.designation().window(), identity);
  }

  acceptDecision(fenetre: FenetreOperateur): void {
    this.designation.update(current => current.afterReplacingWindow(fenetre));
    this.etatHorsLigne.publish(fenetre.snapshot());
  }

  acceptCapture(identity: IdentiteDeFenetre, acceptance: Pick<AcceptationDeGestes, 'applyTo'>): boolean {
    if (!this.isCurrentWindow(identity)) return false;
    this.acceptDecision(acceptance.applyTo(this.currentWindow(identity)));
    return true;
  }

  completeGlobal(identity: IdentiteDeFenetre): void {
    if (this.isCurrentWindow(identity)) this.acceptDecision(this.currentWindow(identity).afterCompletingGlobal());
  }

  refreshReferentiel(): Promise<void> {
    return this.etatHorsLigne.refresh('SYNCHRONIZE', (entreprise, state) => {
      this.reconcile(entreprise, state);
    });
  }

  pushReferentielFreshness(): void {
    this.observe(this.refreshReferentiel());
  }

  reconcile(entreprise: Entreprise | undefined, state: JournalDuPupitre): void {
    const designation = this.designation();
    if (!designation.canReconcileWith(entreprise)) {
      this.releaseWindow();
      return;
    }
    const fenetre = designation.window();
    if (fenetre !== undefined) this.acceptDecision(fenetre.afterReconciling(entreprise, state));
  }

  private settle(): Promise<void> {
    this.scheduleExpiration();
    if (!this.designation().needsClosure()) return Promise.resolve();
    this.fermeture ??= this.drainWindow().finally(() => {
      this.designation.update(current => current.afterCompletingClosure());
      this.scheduleExpiration();
      this.fermeture = undefined;
    });
    return this.fermeture;
  }

  private refresh(): void {
    this.observe(this.settle());
  }

  private scheduleExpiration(): void {
    this.expirationScheduler.schedule(this.state().deadline, {
      expire: () => {
        this.observe(this.expire());
      },
    });
  }

  private async drainWindow(): Promise<void> {
    await this.acceptationLocale.drain();
    this.releaseWindow();
    await this.etatHorsLigne.refresh('RESTORE', (entreprise, state) => {
      this.reconcile(entreprise, state);
    });
    this.pushReferentielFreshness();
  }

  private releaseWindow(): void {
    this.designation.update(current => current.afterReleasingWindow());
    this.scheduleExpiration();
  }

  private observe(operation: Promise<void>): void {
    void operation.catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
