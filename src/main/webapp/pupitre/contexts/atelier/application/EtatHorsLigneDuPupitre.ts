import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  JournalDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { projectReferentiel } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitreProjection';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { inject, Injectable, signal } from '@angular/core';
import { PupitreSynchronization } from './PupitreSynchronization';

type RefreshIntent = 'RESTORE' | 'SYNCHRONIZE';
type Reconcile = (entreprise: string | undefined, state: JournalDuPupitre) => void;

export interface SourceDOuverture {
  readonly entreprise: string;
  readonly state: JournalDuPupitre;
}

@Injectable()
export class EtatHorsLigneDuPupitre {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournauxDuPupitrePort);
  private readonly synchronization = inject(PupitreSynchronization);
  private readonly vue = signal<JournalDuPupitre>(EMPTY_JOURNAL_DU_PUPITRE);
  private readonly connexion = signal(true);

  readonly connected = this.connexion.asReadonly();

  referentiel(): ReturnType<typeof projectReferentiel> {
    return projectReferentiel(this.vue());
  }

  async openingSource(): Promise<SourceDOuverture> {
    await this.authentication.synchronizeSession();
    const entreprise = this.requireTenant();
    const state = await this.journal.read(entreprise);
    if (this.authentication.currentTenant() !== entreprise) {
      throw new Error('L’entreprise du pupitre a change.');
    }
    return { entreprise, state };
  }

  refresh(intent: RefreshIntent, reconcile: Reconcile): Promise<void> {
    if (intent === 'SYNCHRONIZE') {
      return this.synchronization.synchronize((entreprise, state) => {
        this.receive(entreprise, state, reconcile);
      });
    }
    return this.restore(reconcile);
  }

  async diagnostics(): Promise<EvenementDuJournal[]> {
    const state = await this.journal.read(this.requireTenant());
    return state.evenements.filter(evenement => evenement.etat === 'REFUSE');
  }

  publish(state: JournalDuPupitre): void {
    this.vue.set(state);
  }

  private async restore(reconcile: Reconcile): Promise<void> {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      this.receive(undefined, EMPTY_JOURNAL_DU_PUPITRE, reconcile);
      return;
    }
    this.receive(entreprise, await this.journal.read(entreprise), reconcile);
  }

  private receive(entreprise: string | undefined, state: JournalDuPupitre, reconcile: Reconcile): void {
    if (this.authentication.currentTenant() !== entreprise) return;
    if (entreprise === undefined) {
      this.vue.set(EMPTY_JOURNAL_DU_PUPITRE);
    } else {
      this.connexion.set(state.connecte);
      this.vue.set(state);
    }
    reconcile(entreprise, state);
  }

  private requireTenant(): string {
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined) {
      throw new Error('Le pupitre doit etre enrole une premiere fois.');
    }
    return entreprise;
  }
}
