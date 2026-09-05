import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/DesignationExpirationSchedulerPort';
import { DesignationOperateur } from '@/pupitre/contexts/atelier/domain/DesignationOperateur';
import { FenetreOperateur, PointageDuPupitre } from '@/pupitre/contexts/atelier/domain/FenetreOperateur';
import {
  EMPTY_PUPITRE,
  IdentiteDuGeste,
  LocalEvent,
  LocalGeste,
  LocalPupitreState,
  OperateurDuPupitre,
} from '@/pupitre/contexts/atelier/domain/LocalPupitreState';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';
import { projectPupitre } from '@/pupitre/contexts/atelier/domain/PupitreProjection';
import { TypeDePresence } from '@/pupitre/contexts/atelier/domain/TypeDePresence';
import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { PupitreSynchronization } from './PupitreSynchronization';

const identity = (): IdentiteDuGeste => ({ id: crypto.randomUUID(), dateDeSurvenue: new Date().toISOString() });

@Injectable()
export class OfflinePupitre implements OnDestroy {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(PupitreJournalPort);
  private readonly synchronization = inject(PupitreSynchronization);
  private readonly expirationScheduler = inject(DesignationExpirationSchedulerPort);
  private readonly vue = signal<LocalPupitreState>(EMPTY_PUPITRE);
  private readonly connexion = signal(true);
  private readonly designation = new DesignationOperateur();
  private readonly designationState = signal(this.designation.snapshot());

  readonly etatDesignation = this.designationState.asReadonly();
  readonly code = computed(() => this.designationState().code);
  readonly unknownCode = computed(() => this.designationState().unknownCode);
  readonly operateur = computed(() => this.designationState().operateur);
  readonly canValidate = computed(() => this.designationState().canValidate);
  private fermeture: Promise<void> | undefined;
  private saisie: Promise<void> = Promise.resolve();

  readonly connected = this.connexion.asReadonly();

  ngOnDestroy(): void {
    void this.finish();
  }

  referentiel(): ReturnType<typeof projectPupitre> {
    return projectPupitre(this.vue());
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

  async openWindow(code: string): Promise<OperateurDuPupitre> {
    await this.authentication.synchronizeSession();
    this.designation.requireClosedWindow();
    const entreprise = this.requireTenant();
    const vue = await this.journal.read(entreprise);
    if (this.authentication.currentTenant() !== entreprise) {
      throw new Error('L’entreprise du pupitre a change.');
    }
    this.designation.requireClosedWindow();
    const fenetre = this.designation.openWindow(entreprise, vue, code, Date.now());
    this.vue.set(fenetre.snapshot());
    this.refreshDesignation();
    return fenetre.operateur;
  }

  private async drainWindow(): Promise<void> {
    await this.saisie;
    this.designation.releaseWindow();
    await this.restore();
  }

  recordPointage(pointage: PointageDuPupitre): Promise<void> {
    const fenetre = this.requireWindow();
    return this.enqueuePointage(fenetre, pointage);
  }

  private async enqueuePointage(fenetre: FenetreOperateur, pointage: PointageDuPupitre): Promise<void> {
    await this.enqueue(fenetre, fenetre.preparePointage(pointage, identity));
  }

  recordPresence(type: TypeDePresence): Promise<void> {
    const fenetre = this.requireWindow();
    const gestes = fenetre.preparePresence(type, identity());
    return this.enqueue(fenetre, () => gestes);
  }

  async diagnostics(): Promise<LocalEvent[]> {
    const state = await this.journal.read(this.requireTenant());
    return state.evenements.filter(evenement => evenement.etat === 'REFUSE');
  }

  async restore(): Promise<void> {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      this.vue.set(EMPTY_PUPITRE);
      return;
    }
    const state = await this.journal.read(entreprise);
    this.publish(entreprise, state);
  }

  synchronize(): Promise<void> {
    return this.synchronization.synchronize((entreprise, state) => this.publish(entreprise, state));
  }

  private enqueue(fenetre: FenetreOperateur, gestures: () => LocalGeste[]): Promise<void> {
    const accepted = this.saisie.then(() => this.persistGestes(fenetre, gestures));
    this.saisie = accepted.catch(() => undefined);
    return accepted;
  }

  private async persistGestes(fenetre: FenetreOperateur, gestures: () => LocalGeste[]): Promise<void> {
    await this.authentication.synchronizeSession();
    if (this.designation.window() !== fenetre || this.authentication.currentTenant() !== fenetre.entreprise) {
      throw new Error('La fenetre operateur a change.');
    }
    const gestes = gestures();
    await this.journal.append(fenetre.entreprise, gestes);
    fenetre.accept(gestes);
    this.vue.set(fenetre.snapshot());
    void this.synchronize().catch((failure: unknown) => console.error('Synchronisation interrompue', failure));
  }

  private publish(entreprise: string | undefined, state: LocalPupitreState): void {
    if (this.authentication.currentTenant() !== entreprise) {
      return;
    }
    if (entreprise === undefined) {
      this.vue.set(EMPTY_PUPITRE);
      return;
    }
    this.connexion.set(state.connecte);
    const fenetre = this.designation.window();
    if (fenetre !== undefined && fenetre.entreprise !== entreprise) {
      this.designation.releaseWindow();
    }
    if (this.designation.window() === undefined) {
      this.vue.set(state);
    }
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
