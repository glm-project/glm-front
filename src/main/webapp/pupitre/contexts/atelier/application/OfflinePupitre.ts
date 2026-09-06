import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { DesignationOperateur } from '@/pupitre/contexts/atelier/domain/designation/DesignationOperateur';
import {
  DecisionDePointage,
  FenetreOperateur,
  IdentiteOperateurDesigne,
  VueDePointage,
} from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDAtelier,
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
  private readonly designation = new DesignationOperateur();
  private readonly designationState = signal(this.designation.snapshot());
  private readonly pointageState = signal<VueDePointage | undefined>(undefined);
  private readonly refusState = signal<ReturnType<FenetreOperateur['refus']>>(undefined);
  private readonly erreurState = signal<string | undefined>(undefined);

  readonly etatDesignation = this.designationState.asReadonly();
  readonly code = computed(() => this.designationState().code);
  readonly unknownCode = computed(() => this.designationState().unknownCode);
  readonly operateur = computed(() => this.designationState().operateur);
  readonly canValidate = computed(() => this.designationState().canValidate);
  readonly pointage = this.pointageState.asReadonly();
  readonly refusPointage = this.refusState.asReadonly();
  readonly erreurPointage = this.erreurState.asReadonly();
  private fermeture: Promise<void> | undefined;
  private saisie: Promise<void> = Promise.resolve();

  readonly connected = this.connexion.asReadonly();

  ngOnDestroy(): void {
    void this.finish();
  }

  referentiel(): ReturnType<typeof projectReferentiel> {
    return projectReferentiel(this.vue());
  }

  registerPress(): boolean {
    const accepted = this.designation.registerPress(Date.now());
    this.refreshDesignation();
    return accepted;
  }

  enterDigit(digit: string): void {
    this.designation.enterDigit(digit, Date.now());
    this.refreshDesignation();
  }

  erase(): void {
    this.designation.erase(Date.now());
    this.refreshDesignation();
  }

  async validate(): Promise<void> {
    const resolution = this.designation.beginResolution(Date.now());
    this.refreshDesignation();
    if (resolution === undefined) return;
    try {
      await this.openWindow(resolution.code);
      if (!this.designation.completeResolution(resolution, Date.now())) {
        await this.drainWindow();
      }
    } catch {
      this.designation.failResolution(resolution, Date.now());
    } finally {
      this.designation.endResolution();
      this.refreshDesignation();
    }
  }

  finish(): Promise<void> {
    this.designation.finish();
    return this.settleDesignation();
  }

  expire(): Promise<void> {
    this.designation.expire(Date.now());
    return this.settleDesignation();
  }

  private settleDesignation(): Promise<void> {
    this.publishDesignation();
    if (!this.designation.needsClosure()) return Promise.resolve();
    this.fermeture ??= this.drainWindow().finally(() => {
      this.designation.completeClosure();
      this.publishDesignation();
      this.fermeture = undefined;
    });
    return this.fermeture;
  }

  private refreshDesignation(): void {
    void this.settleDesignation();
  }

  private publishDesignation(): void {
    const snapshot = this.designation.snapshot();
    this.designationState.set(snapshot);
    this.expirationScheduler.schedule(snapshot.deadline, { expire: () => void this.expire() });
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
    const fenetre = this.designation.openWindow(entreprise, vue, code, Date.now());
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
    const decision = fenetre.decide(intention.suiviId, intention.cible, identity);
    this.publishWindow(fenetre);
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
    if (current !== fenetre) throw new Error('La fenetre operateur a change.');
    return this.captureDecision(fenetre, fenetre.choosePoste(intention.suiviId, intention.cible, posteId, identity));
  }

  private captureDecision(fenetre: FenetreOperateur, decision: Extract<DecisionDePointage, { kind: 'GESTES' }>): Promise<void> {
    return this.enqueue(fenetre, decision.capture)
      .then(() => {
        this.erreurState.set(undefined);
      })
      .catch((failure: unknown) => {
        this.erreurState.set('Pointage non enregistré — recommencez');
        throw failure;
      });
  }

  recordPresence(type: TypeDePresence): Promise<void> {
    const fenetre = this.requireWindow();
    const gestes = fenetre.preparePresence(type, identity());
    return this.enqueue(fenetre, () => gestes);
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

  private enqueue(fenetre: FenetreOperateur, gestures: () => GesteDAtelier[]): Promise<void> {
    const accepted = this.saisie.then(() => this.persistGestes(fenetre, gestures));
    this.saisie = accepted.catch(() => undefined);
    return accepted;
  }

  private async persistGestes(fenetre: FenetreOperateur, gestures: () => GesteDAtelier[]): Promise<void> {
    await this.authentication.synchronizeSession();
    fenetre.assertEntreprise(this.authentication.currentTenant());
    const gestes = gestures();
    await this.journal.append(fenetre.journalScope(), gestes);
    fenetre.accept(gestes);
    this.publishWindow(fenetre);
    void this.synchronize().catch((failure: unknown) => {
      console.error('Synchronisation interrompue', failure);
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
    fenetre.reconcile(entreprise, state);
    this.publishWindow(fenetre);
  }

  private publishWindow(fenetre: FenetreOperateur): void {
    this.vue.set(fenetre.snapshot());
    this.pointageState.set(fenetre.pointage());
    this.refusState.set(fenetre.refus());
  }

  private closeWindowAndClearPresentation(): void {
    this.designation.releaseWindow();
    this.pointageState.set(undefined);
    this.refusState.set(undefined);
    this.erreurState.set(undefined);
    this.publishDesignation();
  }

  private requireWindow(): FenetreOperateur {
    try {
      return this.designation.requireWindow(Date.now());
    } finally {
      this.refreshDesignation();
    }
  }

  private requireTenant(): string {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      throw new Error('Le pupitre doit etre enrole une premiere fois.');
    }
    return entreprise;
  }
}
