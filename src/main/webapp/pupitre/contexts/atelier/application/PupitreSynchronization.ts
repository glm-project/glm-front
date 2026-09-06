import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { EMPTY_PUPITRE, LocalEvent, LocalGeste, LocalPupitreState } from '@/pupitre/contexts/atelier/domain/journal/LocalPupitreState';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/journal/PupitreJournalPort';
import { decideReplay, operationFor } from '@/pupitre/contexts/atelier/domain/journal/PupitreReplayPolicy';
import { PupitreServerPort } from '@/pupitre/contexts/atelier/domain/journal/PupitreServerPort';
import { RefusDuPupitre } from '@/pupitre/contexts/atelier/domain/refus/RefusDuPupitre';
import { inject, Injectable } from '@angular/core';

type PupitrePublisher = (entreprise: string | undefined, state: LocalPupitreState) => void;

@Injectable()
export class PupitreSynchronization {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(PupitreJournalPort);
  private readonly serveur = inject(PupitreServerPort);
  private synchronization: Promise<void> | undefined;
  private synchronizationRequested = false;

  synchronize(publish: PupitrePublisher): Promise<void> {
    this.synchronizationRequested = true;
    if (this.synchronization !== undefined) {
      return this.synchronization;
    }
    this.synchronization = this.journal
      .synchronize(async () => {
        while (this.synchronizationRequested) {
          this.synchronizationRequested = false;
          await this.exchange(publish);
        }
      })
      .finally(() => {
        this.synchronization = undefined;
      });
    return this.synchronization;
  }

  private async exchange(publish: PupitrePublisher): Promise<void> {
    await this.authentication.synchronizeSession();
    const selected = this.authentication.currentTenant();
    if (selected === undefined) {
      publish(undefined, EMPTY_PUPITRE);
      return;
    }
    publish(selected, await this.journal.read(selected));
    const entreprise = this.authentication.currentTenant();
    if (entreprise === undefined || this.authentication.currentToken() === undefined) {
      return;
    }
    await this.drain(entreprise, publish);
    const token = this.authentication.currentToken();
    if (this.authentication.currentTenant() !== entreprise || token === undefined) {
      return;
    }
    await this.refreshReferentiel(entreprise, token, publish);
  }

  private async refreshReferentiel(entreprise: string, token: string, publish: PupitrePublisher): Promise<void> {
    try {
      const referentiel = await this.serveur.referentiel();
      await this.authentication.synchronizeSession();
      if (this.authentication.currentTenant() === entreprise && this.authentication.currentToken() === token) {
        const state = await this.journal.saveReferentiel(entreprise, referentiel);
        publish(entreprise, state);
      }
    } catch (failure: unknown) {
      console.error('Referentiel non actualise', failure);
    }
  }

  private async drain(entreprise: string, publish: PupitrePublisher): Promise<void> {
    while (this.authentication.currentTenant() === entreprise && this.authentication.currentToken() !== undefined) {
      const state = await this.journal.read(entreprise);
      const evenement = state.evenements.find(candidate => candidate.etat === 'EN_ATTENTE');
      if (evenement === undefined) {
        return;
      }
      const result = await this.replay(entreprise, evenement, publish);
      if (result === undefined) {
        return;
      }
      await this.saveReplay(entreprise, result, publish);
    }
  }

  private async replay(entreprise: string, evenement: LocalEvent, publish: PupitrePublisher): Promise<LocalEvent | undefined> {
    try {
      await this.journal.withSession(async () => {
        await this.authentication.synchronizeSession();
        await this.push(entreprise, evenement.geste);
      });
      return { ...evenement, etat: 'ACCEPTE' };
    } catch (failure: unknown) {
      if (failure instanceof RefusDuPupitre) {
        return { ...evenement, etat: 'REFUSE', refus: { code: failure.code, message: failure.message } };
      }
      await this.markDisconnected(entreprise, publish);
      return undefined;
    }
  }

  private async markDisconnected(entreprise: string, publish: PupitrePublisher): Promise<void> {
    publish(entreprise, await this.journal.markDisconnected(entreprise));
  }

  private async saveReplay(entreprise: string, result: LocalEvent, publish: PupitrePublisher): Promise<void> {
    publish(entreprise, await this.journal.saveResult(entreprise, result));
  }

  private async push(entreprise: string, geste: LocalGeste): Promise<void> {
    try {
      this.requireExchange(entreprise);
      await this.serveur.send(geste);
    } catch (failure: unknown) {
      if (decideReplay(operationFor(geste), failure) === 'RELIRE_ET_REJOUER') {
        await this.retryAfterConcurrence(entreprise, geste);
        return;
      }
      this.absorbOrThrow(geste, failure);
    }
  }

  private async retryAfterConcurrence(entreprise: string, geste: LocalGeste): Promise<void> {
    this.requireExchange(entreprise);
    await this.serveur.reread(geste);
    this.requireExchange(entreprise);
    await this.serveur.send(geste).catch((refusal: unknown) => {
      this.absorbOrThrow(geste, refusal);
    });
  }

  private absorbOrThrow(geste: LocalGeste, failure: unknown): void {
    if (decideReplay(operationFor(geste), failure, 'REJEU') === 'ACCEPTER') {
      return;
    }
    throw failure;
  }

  private requireExchange(entreprise: string): void {
    if (this.authentication.currentTenant() !== entreprise || this.authentication.currentToken() === undefined) {
      throw new Error('L’autorisation du pupitre a change.');
    }
  }
}
