import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { DesignationOperateur } from '@/pupitre/contexts/atelier/domain/designation/DesignationOperateur';
import {
  FenetreOperateur,
  GestesDePointage,
  IdentiteOperateurDesigne,
  VueDePointage,
} from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  IdentiteDuGeste,
  JournalDuPupitre,
  TypeDePresence,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { projectReferentiel } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitreProjection';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { ExecutionDePointage, IntentionDePointage, PointageCommand } from './PointageCommand';
import { PupitreSynchronization } from './PupitreSynchronization';

const identity = (): IdentiteDuGeste => ({ id: crypto.randomUUID(), dateDeSurvenue: new Date().toISOString() });

@Injectable()
export class OfflinePupitre implements OnDestroy, PointageCommand {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournauxDuPupitrePort);
  private readonly synchronization = inject(PupitreSynchronization);
  private readonly expirationScheduler = inject(DesignationExpirationSchedulerPort);
  private readonly vue = signal<JournalDuPupitre>(EMPTY_JOURNAL_DU_PUPITRE);
  private readonly connexion = signal(true);
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
  private saisie: Promise<void> = Promise.resolve();

  readonly connected = this.connexion.asReadonly();

  ngOnDestroy(): void {
    this.observe(this.finish());
  }

  referentiel(): ReturnType<typeof projectReferentiel> {
    return projectReferentiel(this.vue());
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
    await this.authentication.synchronizeSession();
    this.designation.requireClosedWindow();
    const entreprise = this.requireTenant();
    const vue = await this.journal.read(entreprise);
    if (this.authentication.currentTenant() !== entreprise) {
      throw new Error('L’entreprise du pupitre a change.');
    }
    this.designation.requireClosedWindow();
    const opening = this.designation.afterOpeningWindow(entreprise, vue, code, Date.now());
    this.designation = opening.designation;
    const { fenetre } = opening;
    this.publishWindow(fenetre);
    this.refreshDesignation();
    return fenetre.operateur;
  }

  private async drainWindow(): Promise<void> {
    await this.saisie;
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
    return this.enqueue(fenetre, decision)
      .then(() => {
        if (this.isCurrentWindow(fenetre)) this.erreurAtelierState.set(undefined);
      })
      .catch((failure: unknown) => {
        if (this.isCurrentWindow(fenetre)) this.erreurAtelierState.set('Action non enregistrée — recommencez');
        throw failure;
      });
  }

  recordPresence(type: TypeDePresence): Promise<void> {
    const fenetre = this.requireWindow();
    const gestes = fenetre.preparePresence(type, identity());
    return this.enqueue(fenetre, { kind: 'GESTES', capture: () => gestes, numerosParGeste: new Map() });
  }

  async diagnostics(): Promise<EvenementDuJournal[]> {
    const state = await this.journal.read(this.requireTenant());
    return state.evenements.filter(evenement => evenement.etat === 'REFUSE');
  }

  async restore(): Promise<void> {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      this.closeWindowAndClearPresentation();
      this.vue.set(EMPTY_JOURNAL_DU_PUPITRE);
      return;
    }
    const state = await this.journal.read(entreprise);
    this.publish(entreprise, state);
  }

  synchronize(): Promise<void> {
    return this.synchronization.synchronize((entreprise, state) => {
      this.publish(entreprise, state);
    });
  }

  private enqueue(fenetre: FenetreOperateur, gestures: GestesDePointage): Promise<void> {
    const accepted = this.saisie.then(() => this.persistGestes(fenetre, gestures));
    this.saisie = accepted.catch(() => undefined);
    return accepted;
  }

  private async persistGestes(fenetre: FenetreOperateur, gestures: GestesDePointage): Promise<void> {
    await this.authentication.synchronizeSession();
    fenetre.assertEntreprise(this.authentication.currentTenant());
    const current = this.currentWindow(fenetre);
    const gestes = current.capture(gestures);
    await this.journal.append(fenetre.journalScope(), gestes);
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

  private publish(entreprise: string | undefined, state: JournalDuPupitre): void {
    if (this.authentication.currentTenant() !== entreprise) {
      return;
    }
    if (entreprise === undefined) {
      this.closeWindowAndClearPresentation();
      this.vue.set(EMPTY_JOURNAL_DU_PUPITRE);
      return;
    }
    this.connexion.set(state.connecte);
    const fenetre = this.designation.window();
    if (fenetre === undefined) {
      this.vue.set(state);
      return;
    }
    if (!fenetre.belongsTo(entreprise)) {
      this.closeWindowAndClearPresentation();
      this.vue.set(state);
      return;
    }
    const next = fenetre.afterReconciling(entreprise, state);
    this.designation = this.designation.afterReplacingWindow(next);
    this.publishWindow(next);
  }

  private publishWindow(fenetre: FenetreOperateur): void {
    this.vue.set(fenetre.snapshot());
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

  private requireWindow(): FenetreOperateur {
    const access = this.designation.windowAfterPress(Date.now());
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

  private requireTenant(): string {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      throw new Error('Le pupitre doit etre enrole une premiere fois.');
    }
    return entreprise;
  }
}
