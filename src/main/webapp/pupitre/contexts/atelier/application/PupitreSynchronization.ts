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
import { BilanDePublication } from '@/pupitre/contexts/atelier/domain/synchronisation/BilanDePublication';
import { decideReplay, operationFor } from '@/pupitre/contexts/atelier/domain/synchronisation/GesteReplayPolicy';
import { err, ok, Result } from '@/pupitre/contexts/atelier/domain/synchronisation/Result';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { inject, Injectable } from '@angular/core';

type PupitrePublisher = (entreprise: Entreprise | undefined, state: JournalDuPupitre) => void;

@Injectable()
export class PupitreSynchronization {
  private readonly authentication = inject(AuthenticationPort);
  private readonly session = inject(DeviceSessionPort);
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
              try {
                publish(entreprise, state);
              } catch (failure: unknown) {
                this.errorHandler.handleError(failure);
              }
            }
          }),
        );
      }
    } finally {
      this.synchronizationRequested = false;
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
    const bilan = await this.drain(entreprise, publish);
    if (!bilan.allowsReferentialRefresh()) {
      return;
    }
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

  private async drain(entreprise: Entreprise, publish: PupitrePublisher): Promise<BilanDePublication> {
    while (this.keepsExchanging(entreprise)) {
      const state = await this.journal.read(entreprise);
      const evenements = new EvenementsDuJournal(state.evenements);
      const evenement = evenements.nextPending();
      const noPendingGestureRemains = evenement === undefined;
      if (noPendingGestureRemains) {
        return BilanDePublication.TERMINE;
      }
      const result = await this.replay(entreprise, evenement, evenements, publish);
      if (result === undefined) {
        return BilanDePublication.INTERROMPU;
      }
      await this.saveReplay(entreprise, result, publish);
    }
    return BilanDePublication.INTERROMPU;
  }

  private async replay(
    entreprise: Entreprise,
    evenement: EvenementDuJournal,
    evenements: EvenementsDuJournal,
    publish: PupitrePublisher,
  ): Promise<EvenementDuJournal | undefined> {
    try {
      const result = await this.withSession(async () => {
        await this.authentication.synchronizeSession();
        return this.push(entreprise, evenement.geste, evenements);
      });
      return result.ok ? acceptPublication(evenement.geste, result.value) : refusePublication(evenement.geste, result.error);
    } catch (failure: unknown) {
      this.errorHandler.handleError(failure);
      await this.markDisconnected(entreprise, publish);
      return undefined;
    }
  }

  private withSession<T>(action: () => Promise<T>): Promise<T> {
    return this.session.withSession(action);
  }

  private async markDisconnected(entreprise: Entreprise, publish: PupitrePublisher): Promise<void> {
    publish(entreprise, await this.journal.markDisconnected(entreprise));
  }

  private async saveReplay(entreprise: Entreprise, result: EvenementDuJournal, publish: PupitrePublisher): Promise<void> {
    publish(entreprise, await this.journal.saveResult(entreprise, result));
  }

  private async push(
    entreprise: Entreprise,
    geste: GesteDAtelier,
    evenements: EvenementsDuJournal,
  ): Promise<Result<boolean, RefusDePublication>> {
    this.requireExchange(entreprise);
    const result = await this.serveur.send(geste);
    if (result.ok) {
      return ok(true);
    }
    if (decideReplay(operationFor(geste, evenements), result.error) === 'RELIRE_ET_REJOUER') {
      return this.retryAfterConcurrence(entreprise, geste, evenements);
    }
    return this.absorbOrRefuse(geste, evenements, result.error);
  }

  private async retryAfterConcurrence(
    entreprise: Entreprise,
    geste: GesteDAtelier,
    evenements: EvenementsDuJournal,
  ): Promise<Result<boolean, RefusDePublication>> {
    this.requireExchange(entreprise);
    await this.serveur.reread(geste);
    this.requireExchange(entreprise);
    const result = await this.serveur.send(geste);
    if (result.ok) {
      return ok(true);
    }
    return this.absorbOrRefuse(geste, evenements, result.error);
  }

  private absorbOrRefuse(
    geste: GesteDAtelier,
    evenements: EvenementsDuJournal,
    refusal: RefusDePublication,
  ): Result<boolean, RefusDePublication> {
    return decideReplay(operationFor(geste, evenements), refusal, 'REJEU') === 'ACCEPTER' ? ok(false) : err(refusal);
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
