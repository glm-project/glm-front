import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { DesignationOperateur } from '@/pupitre/contexts/atelier/domain/designation/DesignationOperateur';
import {
  FenetreOperateur,
  GestesDePointage,
  IdentiteOperateurDesigne,
  VueDePointage,
} from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import {
  GesteDAtelier,
  IdentiteDuGeste,
  JournalDuPupitre,
  TypeDePresence,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { AcceptationLocaleDesGestes } from './AcceptationLocaleDesGestes';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';
import { ExecutionDePointage, IntentionDePointage, PointageCommand } from './PointageCommand';

const identity = (): IdentiteDuGeste => ({ id: crypto.randomUUID(), dateDeSurvenue: new Date().toISOString() });

@Injectable()
export class OfflinePupitre implements OnDestroy, PointageCommand {
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);
  private readonly acceptationLocale = inject(AcceptationLocaleDesGestes);
  private readonly expirationScheduler = inject(DesignationExpirationSchedulerPort);
  private designation = DesignationOperateur.empty();
  private readonly designationState = signal(this.designation.snapshot());
  private readonly pointageState = signal<VueDePointage | undefined>(undefined);
  private readonly refusAtelierState = signal<ReturnType<FenetreOperateur['refusal']>>(undefined);
  private readonly erreurAtelierState = signal<string | undefined>(undefined);

  readonly etatDesignation = this.designationState.asReadonly();
  readonly code = computed(() => this.designationState().code);
  readonly unknownCode = computed(() => this.designationState().unknownCode);
  readonly operateur = computed(() => this.designationState().operateur);
  readonly canValidate = computed(() => this.designationState().canValidate);
  readonly pointage = this.pointageState.asReadonly();
  readonly refusAtelier = this.refusAtelierState.asReadonly();
  readonly erreurAtelier = this.erreurAtelierState.asReadonly();
  private fermeture: Promise<void> | undefined;

  readonly connected = this.etatHorsLigne.connected;

  ngOnDestroy(): void {
    this.observe(this.finish());
  }

  referentiel(): ReturnType<EtatHorsLigneDuPupitre['referentiel']> {
    return this.etatHorsLigne.referentiel();
  }

  registerPress(): boolean {
    const press = this.designation.afterPress(Date.now());
    this.designation = press.designation;
    this.refreshDesignation();
    return press.accepted;
  }

  enterDigit(digit: string): void {
    this.designation = this.designation.afterDigit(digit, Date.now());
    this.refreshDesignation();
  }

  erase(): void {
    this.designation = this.designation.afterErasing(Date.now());
    this.refreshDesignation();
  }

  async validate(): Promise<void> {
    const beginning = this.designation.afterBeginningResolution(Date.now());
    this.designation = beginning.designation;
    this.refreshDesignation();
    const { resolution } = beginning;
    if (resolution === undefined) return;
    try {
      await this.openWindow(resolution.code);
      const completion = this.designation.afterCompletingResolution(resolution, Date.now());
      this.designation = completion.designation;
      if (!completion.accepted) {
        await this.drainWindow();
      }
    } catch {
      this.designation = this.designation.afterFailingResolution(resolution, Date.now());
    } finally {
      this.designation = this.designation.afterEndingResolution();
      this.refreshDesignation();
    }
  }

  finish(): Promise<void> {
    this.designation = this.designation.afterFinish();
    return this.settleDesignation();
  }

  expire(): Promise<void> {
    this.designation = this.designation.afterExpiration(Date.now());
    return this.settleDesignation();
  }

  private settleDesignation(): Promise<void> {
    this.publishDesignation();
    if (!this.designation.needsClosure()) return Promise.resolve();
    this.fermeture ??= this.drainWindow().finally(() => {
      this.designation = this.designation.afterCompletingClosure();
      this.publishDesignation();
      this.fermeture = undefined;
    });
    return this.fermeture;
  }

  private refreshDesignation(): void {
    this.observe(this.settleDesignation());
  }

  private publishDesignation(): void {
    const snapshot = this.designation.snapshot();
    this.designationState.set(snapshot);
    this.expirationScheduler.schedule(snapshot.deadline, {
      expire: () => {
        this.observe(this.expire());
      },
    });
  }

  async openWindow(code: string): Promise<IdentiteOperateurDesigne> {
    const { entreprise, state } = await this.etatHorsLigne.openingSource();
    this.designation.requireClosedWindow();
    const opening = this.designation.afterOpeningWindow(entreprise, state, code, Date.now());
    this.designation = opening.designation;
    const { fenetre } = opening;
    this.publishWindow(fenetre);
    this.refreshDesignation();
    return fenetre.operateur;
  }

  private async drainWindow(): Promise<void> {
    await this.acceptationLocale.drain();
    this.closeWindowAndClearPresentation();
    await this.restore();
  }

  execute(intention: IntentionDePointage): ExecutionDePointage {
    const fenetre = this.requireWindow();
    const result = fenetre.afterDeciding(intention.suiviId, intention.cible, identity);
    this.designation = this.designation.afterReplacingWindow(result.fenetre);
    const decision = result.decision;
    this.publishWindow(result.fenetre);
    if (decision.kind === 'CHOIX_POSTE_REQUIS') {
      return {
        kind: decision.kind,
        numero: decision.numero,
        postes: decision.postes,
        choose: posteId => this.choosePoste(fenetre, intention, posteId),
      };
    }
    return { kind: 'CAPTURE', completion: this.captureDecision(fenetre, decision) };
  }

  private choosePoste(fenetre: FenetreOperateur, intention: IntentionDePointage, posteId: string): Promise<void> {
    const current = this.requireWindow();
    if (!current.hasIdentity(fenetre)) throw new Error('La fenetre operateur a change.');
    const result = current.afterChoosingPoste(intention.suiviId, intention.cible, posteId, identity);
    this.designation = this.designation.afterReplacingWindow(result.fenetre);
    return this.captureDecision(result.fenetre, result.decision);
  }

  private captureDecision(fenetre: FenetreOperateur, decision: GestesDePointage): Promise<void> {
    return this.captureOperation(
      fenetre,
      this.acceptationLocale.capture(fenetre, decision, () => this.currentWindow(fenetre)),
    );
  }

  private captureOperation(fenetre: FenetreOperateur, operation: Promise<readonly GesteDAtelier[]>): Promise<void> {
    return operation
      .then(gestes => {
        this.afterAccept(fenetre, gestes);
        if (this.isCurrentWindow(fenetre)) this.erreurAtelierState.set(undefined);
      })
      .catch((failure: unknown) => {
        if (this.isCurrentWindow(fenetre)) this.erreurAtelierState.set('Action non enregistrée — recommencez');
        throw failure;
      });
  }

  recordPresence(type: TypeDePresence): Promise<void> {
    const fenetre = this.requireWindow();
    const gestes = fenetre.preparePresence(type, identity);
    return this.acceptationLocale
      .capture(fenetre, gestes, () => this.currentWindow(fenetre))
      .then(accepted => {
        this.afterAccept(fenetre, accepted);
      });
  }

  diagnostics(): ReturnType<EtatHorsLigneDuPupitre['diagnostics']> {
    return this.etatHorsLigne.diagnostics();
  }

  restore(): Promise<void> {
    return this.etatHorsLigne.refresh('RESTORE', (entreprise, state) => {
      this.reconcile(entreprise, state);
    });
  }

  synchronize(): Promise<void> {
    return this.etatHorsLigne.refresh('SYNCHRONIZE', (entreprise, state) => {
      this.reconcile(entreprise, state);
    });
  }

  private afterAccept(fenetre: FenetreOperateur, gestes: readonly GesteDAtelier[]): void {
    const latest = this.designation.window();
    if (latest === undefined || !latest.hasIdentity(fenetre)) return;
    const next = latest.afterAccept(gestes);
    this.designation = this.designation.afterReplacingWindow(next);
    this.publishWindow(next);
    void this.synchronize().catch((failure: unknown) => {
      console.error('Synchronisation interrompue', failure);
    });
  }

  private observe(operation: Promise<void>): void {
    void operation.catch((failure: unknown) => {
      console.error('Operation asynchrone interrompue', failure);
    });
  }

  private reconcile(entreprise: string | undefined, state: JournalDuPupitre): void {
    if (entreprise === undefined) {
      this.closeWindowAndClearPresentation();
      return;
    }
    const fenetre = this.designation.window();
    if (fenetre === undefined) return;
    if (!fenetre.belongsTo(entreprise)) {
      this.closeWindowAndClearPresentation();
      return;
    }
    const next = fenetre.afterReconciling(entreprise, state);
    this.designation = this.designation.afterReplacingWindow(next);
    this.publishWindow(next);
  }

  private publishWindow(fenetre: FenetreOperateur): void {
    this.etatHorsLigne.publish(fenetre.snapshot());
    this.pointageState.set(fenetre.pointage());
    this.refusAtelierState.set(fenetre.refusal());
  }

  private closeWindowAndClearPresentation(): void {
    this.designation = this.designation.afterReleasingWindow();
    this.pointageState.set(undefined);
    this.refusAtelierState.set(undefined);
    this.erreurAtelierState.set(undefined);
    this.publishDesignation();
  }

  private requireWindow(now = Date.now()): FenetreOperateur {
    const access = this.designation.windowAfterPress(now);
    this.designation = access.designation;
    this.refreshDesignation();
    if (access.fenetre === undefined) throw new Error('Aucune fenetre operateur ouverte.');
    return access.fenetre;
  }

  private currentWindow(fenetre: FenetreOperateur): FenetreOperateur {
    const current = this.designation.window();
    if (current === undefined || !current.hasIdentity(fenetre)) throw new Error('La fenetre operateur a change.');
    return current;
  }

  private isCurrentWindow(fenetre: FenetreOperateur): boolean {
    return this.designation.window()?.hasIdentity(fenetre) ?? false;
  }
}
