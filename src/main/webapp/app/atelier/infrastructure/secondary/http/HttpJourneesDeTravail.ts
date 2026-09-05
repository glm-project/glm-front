import { JourneesDeTravailPort } from '@/app/atelier/domain/JourneesDeTravailPort';
import { IdentiteDuGeste } from '@/app/atelier/domain/PupitreLocal';
import { TypeDePresence } from '@/app/atelier/domain/TypeDePresence';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { inject, Injectable } from '@angular/core';
import { send, sendAbsorbing } from '../envoiDAtelier';

@Injectable()
export class HttpJourneesDeTravail extends JourneesDeTravailPort {
  private readonly api = inject(ClientApi);

  override ensureOperateurArrived(operateurId: string, identite: IdentiteDuGeste): Promise<void> {
    return sendAbsorbing(
      'journee-de-travail-deja-ouverte',
      () => this.api.write('/api/atelier/journees', { body: { ...identite, operateur: operateurId } }),
      () => this.reread(operateurId),
    );
  }

  override ensureOperateurPresent(operateurId: string, identite: IdentiteDuGeste): Promise<void> {
    return sendAbsorbing(
      'transition-de-presence-interdite',
      () => this.pointage(operateurId, 'REPRISE', identite),
      () => this.reread(operateurId),
    );
  }

  override recordPresence(operateurId: string, type: TypeDePresence, identite: IdentiteDuGeste): Promise<void> {
    return send(
      () => this.pointage(operateurId, type, identite),
      () => this.reread(operateurId),
    );
  }

  private pointage(operateurId: string, type: TypeDePresence, identite: IdentiteDuGeste): Promise<unknown> {
    return this.api.write('/api/atelier/journees/pointages', { body: { ...identite, operateur: operateurId, type } });
  }

  private reread(operateurId: string): Promise<unknown> {
    return this.api.read('/api/atelier/journees', { parametres: { operateur: operateurId, size: 100 } });
  }
}
