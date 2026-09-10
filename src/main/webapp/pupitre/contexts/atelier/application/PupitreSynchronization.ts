import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  acceptPublication,
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  EvenementsDuJournal,
  GesteDAtelier,
  JournalDuPupitre,
  refusePublication,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { decideReplay, operationFor } from '@/pupitre/contexts/atelier/domain/synchronisation/GesteReplayPolicy';
import { inject, Injectable } from '@angular/core';

type PupitrePublisher = (entreprise: Entreprise | undefined, state: JournalDuPupitre) => void;

@Injectable()
export class PupitreSynchronization {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournauxDuPupitrePort);
  private readonly serveur = inject(AtelierExchangePort);
  private readonly errorHandler = inject(ErrorHandlerPort);
  private synchronization: Promise<void> | undefined;
  private synchronizationRequested = false;
  private readonly publishers = new Set<PupitrePublisher>();

  synchronize(publish: PupitrePublisher): Promise<void> {
    this.publishers.add(publish);
    this.synchronizationRequested = true;
    this.synchronization ??= this.runSynchronization();
    return this.synchronization;
  }

  private async runSynchronization(): Promise<void> {
    try {
      while (this.synchronizationRequested) {
        this.synchronizationRequested = false;
        await this.journal.synchronize(() =>
          this.exchange((entreprise, state) => {
            for (const publish of [...this.publishers]) {
              publish(entreprise, state);
            }
          }),
        );
      }
    } finally {
      this.synchronization = undefined;
      this.publishers.clear();
    }
  }

  private async exchange(publish: PupitrePublisher): Promise<void> {
    await this.authentication.synchronizeSession();
    const selected = this.currentEntreprise();
    if (selected === undefined) {
      publish(undefined, EMPTY_JOURNAL_DU_PUPITRE);
      return;
    }
    publish(selected, await this.journal.read(selected));
    const entreprise = this.currentEntreprise();
    if (entreprise === undefined) {
      return;
    }
    await this.drain(entreprise, publish);
    const token = this.authentication.currentToken();
    if (!this.canRefreshWith(entreprise, token)) {
      return;
    }
    await this.refreshReferentiel(entreprise, token, publish);
  }

  private async refreshReferentiel(entreprise: Entreprise, token: string, publish: PupitrePublisher): Promise<void> {
    try {
      const referentiel = await this.serveur.referentiel();
      await this.authentication.synchronizeSession();
      if (this.hasUnchangedAuthorization(entreprise, token)) {
        const state = await this.journal.saveReferentiel(entreprise, referentiel);
        publish(entreprise, state);
      }
    } catch (failure: unknown) {
      this.errorHandler.handleError(failure);
    }
  }

  private async drain(entreprise: Entreprise, publish: PupitrePublisher): Promise<void> {
    while (this.keepsExchanging(entreprise)) {
      const state = await this.journal.read(entreprise);
      const evenements = new EvenementsDuJournal(state.evenements);
      const evenement = evenements.nextPending();
      if (evenement === undefined) {
        return;
      }
      const result = await this.replay(entreprise, evenement, evenements, publish);
      if (result === undefined) {
        return;
      }
      await this.saveReplay(entreprise, result, publish);
    }
  }

  private async replay(
    entreprise: Entreprise,
    evenement: EvenementDuJournal,
    evenements: EvenementsDuJournal,
    publish: PupitrePublisher,
  ): Promise<EvenementDuJournal | undefined> {
    try {
      const journeeOuverte = await this.journal.withSession(async () => {
        await this.authentication.synchronizeSession();
        return this.push(entreprise, evenement.geste, evenements);
      });
      return acceptPublication(evenement.geste, journeeOuverte);
    } catch (failure: unknown) {
      if (failure instanceof RefusDePublication) {
        return refusePublication(evenement.geste, failure);
      }
      await this.markDisconnected(entreprise, publish);
      return undefined;
    }
  }

  private async markDisconnected(entreprise: Entreprise, publish: PupitrePublisher): Promise<void> {
    publish(entreprise, await this.journal.markDisconnected(entreprise));
  }

  private async saveReplay(entreprise: Entreprise, result: EvenementDuJournal, publish: PupitrePublisher): Promise<void> {
    publish(entreprise, await this.journal.saveResult(entreprise, result));
  }

  private async push(entreprise: Entreprise, geste: GesteDAtelier, evenements: EvenementsDuJournal): Promise<boolean> {
    try {
      this.requireExchange(entreprise);
      await this.serveur.send(geste);
      return true;
    } catch (failure: unknown) {
      if (decideReplay(operationFor(geste, evenements), failure) === 'RELIRE_ET_REJOUER') {
        return this.retryAfterConcurrence(entreprise, geste, evenements);
      }
      this.absorbOrThrow(geste, evenements, failure);
      return false;
    }
  }

  private async retryAfterConcurrence(entreprise: Entreprise, geste: GesteDAtelier, evenements: EvenementsDuJournal): Promise<boolean> {
    this.requireExchange(entreprise);
    await this.serveur.reread(geste);
    this.requireExchange(entreprise);
    try {
      await this.serveur.send(geste);
      return true;
    } catch (failure: unknown) {
      this.absorbOrThrow(geste, evenements, failure);
      return false;
    }
  }

  private absorbOrThrow(geste: GesteDAtelier, evenements: EvenementsDuJournal, failure: unknown): void {
    if (decideReplay(operationFor(geste, evenements), failure, 'REJEU') === 'ACCEPTER') {
      return;
    }
    throw failure;
  }

  private requireExchange(entreprise: Entreprise): void {
    if (this.hasLostAuthorization(entreprise)) {
      throw new Error('L’autorisation du pupitre a change.');
    }
  }

  private canRefreshWith(entreprise: Entreprise, token: string | undefined): token is string {
    return !(!this.stillSelects(entreprise) || token === undefined);
  }

  private hasUnchangedAuthorization(entreprise: Entreprise, token: string): boolean {
    return this.stillSelects(entreprise) && this.authentication.currentToken() === token;
  }

  private hasLostAuthorization(entreprise: Entreprise): boolean {
    return !this.stillSelects(entreprise) || this.authentication.currentToken() === undefined;
  }

  private keepsExchanging(entreprise: Entreprise): boolean {
    return this.stillSelects(entreprise) && this.authentication.currentToken() !== undefined;
  }

  private stillSelects(entreprise: Entreprise): boolean {
    return Entreprise.same(this.currentEntreprise(), entreprise);
  }

  private currentEntreprise(): Entreprise | undefined {
    return Entreprise.from(this.authentication.currentTenant());
  }
}
