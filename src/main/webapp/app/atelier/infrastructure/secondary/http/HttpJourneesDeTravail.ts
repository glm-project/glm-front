import { JourneesDeTravailPort } from '@/app/atelier/domain/JourneesDeTravailPort';
import { TypeDePresence } from '@/app/atelier/domain/TypeDePresence';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { inject, Injectable } from '@angular/core';
import { send, sendAbsorbing } from '../envoiDAtelier';

const UNE_REPRISE: TypeDePresence = 'REPRISE';

@Injectable()
export class HttpJourneesDeTravail extends JourneesDeTravailPort {
  private readonly api = inject(ClientApi);

  override ensureOperateurArrived(operateurId: string): Promise<void> {
    return sendAbsorbing('journee-de-travail-deja-ouverte', () =>
      this.api.write('/api/atelier/journees', { body: { operateur: operateurId } }),
    );
  }

  override ensureOperateurPresent(operateurId: string): Promise<void> {
    return sendAbsorbing('transition-de-presence-interdite', () => this.pointage(operateurId, UNE_REPRISE));
  }

  override recordPresence(operateurId: string, type: TypeDePresence): Promise<void> {
    return send(() => this.pointage(operateurId, type));
  }

  private pointage(operateurId: string, type: TypeDePresence): Promise<unknown> {
    return this.api.write('/api/atelier/journees/pointages', { body: { operateur: operateurId, type } });
  }
}
