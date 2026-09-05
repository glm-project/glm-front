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
import { inject, Injectable, signal } from '@angular/core';
import { SynchronisationDuPupitre } from './SynchronisationDuPupitre';

const identity = (): IdentiteDuGeste => ({ id: crypto.randomUUID(), dateDeSurvenue: new Date().toISOString() });

@Injectable()
export class PupitreHorsLigne {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournalDuPupitrePort);
  private readonly synchronisation = inject(SynchronisationDuPupitre);
  private readonly vue = signal<PupitreLocal>(PUPITRE_VIDE);
  private readonly connexion = signal(true);
  private fenetre: FenetreOperateur | undefined;
  private saisie: Promise<void> = Promise.resolve();

  readonly connected = this.connexion.asReadonly();

  referentiel(): ReturnType<typeof projectPupitre> {
    return projectPupitre(this.vue());
  }

  async openWindow(code: string): Promise<OperateurDuPupitre> {
    await this.authentication.synchronizeSession();
    if (this.fenetre !== undefined) {
      throw new Error('Une fenetre operateur est deja ouverte.');
    }
    const entreprise = this.requireTenant();
    const vue = await this.journal.read(entreprise);
    if (this.authentication.currentTenant() !== entreprise) {
      throw new Error('L’entreprise du pupitre a change.');
    }
    this.fenetre = new FenetreOperateur(entreprise, vue, code);
    this.vue.set(this.fenetre.snapshot());
    return this.fenetre.operateur;
  }

  async closeWindow(): Promise<void> {
    await this.saisie;
    this.fenetre = undefined;
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
    if (this.fenetre !== fenetre || this.authentication.currentTenant() !== fenetre.entreprise) {
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
    if (this.fenetre !== undefined && this.fenetre.entreprise !== entreprise) {
      this.fenetre = undefined;
    }
    if (this.fenetre === undefined) {
      this.vue.set(state);
    }
  }

  private requireTenant(): string {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      throw new Error('Le pupitre doit etre enrole une premiere fois.');
    }
    return entreprise;
  }

  private requireWindow(): FenetreOperateur {
    if (this.fenetre === undefined) {
      throw new Error('Aucune fenetre operateur ouverte.');
    }
    return this.fenetre;
  }
}
