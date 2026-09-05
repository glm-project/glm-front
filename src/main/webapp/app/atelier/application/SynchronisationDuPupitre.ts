import { JournalDuPupitrePort } from '@/app/atelier/domain/JournalDuPupitrePort';
import { decideRejeu, operationFor } from '@/app/atelier/domain/PolitiqueDeRejeu';
import { EvenementLocal, GesteLocal, PUPITRE_VIDE, PupitreLocal } from '@/app/atelier/domain/PupitreLocal';
import { RefusDuPupitre } from '@/app/atelier/domain/RefusDuPupitre';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { inject, Injectable } from '@angular/core';

type PublicationDuPupitre = (entreprise: string | undefined, state: PupitreLocal) => void;

@Injectable()
export class SynchronisationDuPupitre {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournalDuPupitrePort);
  private readonly serveur = inject(ServeurDuPupitrePort);
  private synchronisation: Promise<void> | undefined;
  private synchronisationDemandee = false;

  synchronize(publish: PublicationDuPupitre): Promise<void> {
    this.synchronisationDemandee = true;
    if (this.synchronisation !== undefined) {
      return this.synchronisation;
    }
    this.synchronisation = this.journal
      .synchronize(async () => {
        while (this.synchronisationDemandee) {
          this.synchronisationDemandee = false;
          await this.exchange(publish);
        }
      })
      .finally(() => {
        this.synchronisation = undefined;
      });
    return this.synchronisation;
  }

  private async exchange(publish: PublicationDuPupitre): Promise<void> {
    await this.authentication.synchronizeSession();
    const selected = this.authentication.currentTenant();
    if (selected === undefined) {
      publish(undefined, PUPITRE_VIDE);
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

  private async refreshReferentiel(entreprise: string, token: string, publish: PublicationDuPupitre): Promise<void> {
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

  private async drain(entreprise: string, publish: PublicationDuPupitre): Promise<void> {
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

  private async replay(entreprise: string, evenement: EvenementLocal, publish: PublicationDuPupitre): Promise<EvenementLocal | undefined> {
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

  private async markDisconnected(entreprise: string, publish: PublicationDuPupitre): Promise<void> {
    publish(entreprise, await this.journal.markDisconnected(entreprise));
  }

  private async saveReplay(entreprise: string, result: EvenementLocal, publish: PublicationDuPupitre): Promise<void> {
    publish(entreprise, await this.journal.saveResult(entreprise, result));
  }

  private async push(entreprise: string, geste: GesteLocal): Promise<void> {
    try {
      this.requireExchange(entreprise);
      await this.serveur.send(geste);
    } catch (failure: unknown) {
      if (decideRejeu(operationFor(geste), failure) === 'RELIRE_ET_REJOUER') {
        await this.retryAfterConcurrence(entreprise, geste);
        return;
      }
      this.absorbOrThrow(geste, failure);
    }
  }

  private async retryAfterConcurrence(entreprise: string, geste: GesteLocal): Promise<void> {
    this.requireExchange(entreprise);
    await this.serveur.reread(geste);
    this.requireExchange(entreprise);
    await this.serveur.send(geste).catch((refusal: unknown) => this.absorbOrThrow(geste, refusal));
  }

  private absorbOrThrow(geste: GesteLocal, failure: unknown): void {
    if (decideRejeu(operationFor(geste), failure, 'REJEU') === 'ACCEPTER') {
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
