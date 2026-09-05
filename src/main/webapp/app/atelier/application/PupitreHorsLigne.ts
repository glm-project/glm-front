import { DesignationOperateur } from '@/app/atelier/domain/DesignationOperateur';
import { FenetreOperateur, PointageDuPupitre } from '@/app/atelier/domain/FenetreOperateur';
import { JournalDuPupitrePort } from '@/app/atelier/domain/JournalDuPupitrePort';
import { projectPupitre } from '@/app/atelier/domain/ProjectionDuPupitre';
import {
  EvenementLocal,
  GesteLocal,
  IdentiteDuGeste,
  OperateurDuPupitre,
  PUPITRE_VIDE,
  PupitreLocal,
} from '@/app/atelier/domain/PupitreLocal';
import { TypeDePresence } from '@/app/atelier/domain/TypeDePresence';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { computed, inject, Injectable, signal } from '@angular/core';
import { SynchronisationDuPupitre } from './SynchronisationDuPupitre';

const identity = (): IdentiteDuGeste => ({ id: crypto.randomUUID(), dateDeSurvenue: new Date().toISOString() });

@Injectable()
export class PupitreHorsLigne {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournalDuPupitrePort);
  private readonly synchronisation = inject(SynchronisationDuPupitre);
  private readonly vue = signal<PupitreLocal>(PUPITRE_VIDE);
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
    this.designationState.set(this.designation.snapshot());
    if (!this.designation.needsClosure()) return Promise.resolve();
    this.fermeture ??= this.drainWindow().finally(() => {
      this.designation.completeClosure();
      this.designationState.set(this.designation.snapshot());
      this.fermeture = undefined;
    });
    return this.fermeture;
  }

  private refreshDesignation(): void {
    void this.settleDesignation();
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

  async diagnostics(): Promise<EvenementLocal[]> {
    const state = await this.journal.read(this.requireTenant());
    return state.evenements.filter(evenement => evenement.etat === 'REFUSE');
  }

  async restore(): Promise<void> {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      this.vue.set(PUPITRE_VIDE);
      return;
    }
    const state = await this.journal.read(entreprise);
    this.publish(entreprise, state);
  }

  synchronize(): Promise<void> {
    return this.synchronisation.synchronize((entreprise, state) => this.publish(entreprise, state));
  }

  private enqueue(fenetre: FenetreOperateur, gestures: () => GesteLocal[]): Promise<void> {
    const accepted = this.saisie.then(() => this.persistGestes(fenetre, gestures));
    this.saisie = accepted.catch(() => undefined);
    return accepted;
  }

  private async persistGestes(fenetre: FenetreOperateur, gestures: () => GesteLocal[]): Promise<void> {
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

  private publish(entreprise: string | undefined, state: PupitreLocal): void {
    if (this.authentication.currentTenant() !== entreprise) {
      return;
    }
    if (entreprise === undefined) {
      this.vue.set(PUPITRE_VIDE);
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
