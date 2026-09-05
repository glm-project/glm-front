import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { JourneesDeTravailPort } from '@/pupitre/contexts/atelier/domain/JourneesDeTravailPort';
import { IdentiteDuGeste } from '@/pupitre/contexts/atelier/domain/LocalPupitreState';
import { TypeDePresence } from '@/pupitre/contexts/atelier/domain/TypeDePresence';
import { inject, Injectable } from '@angular/core';
import { send } from '../sendToAtelier';

@Injectable()
export class HttpJourneesDeTravail extends JourneesDeTravailPort {
  private readonly api = inject(ApiClient);

  override ensureOperateurArrived(operateurId: string, identite: IdentiteDuGeste): Promise<void> {
    return send(
      () => this.api.write('/api/atelier/journees', { body: { ...identite, operateur: operateurId } }),
      () => this.reread(operateurId),
      'ARRIVEE_ASSUREE',
    );
  }

  override ensureOperateurPresent(operateurId: string, identite: IdentiteDuGeste): Promise<void> {
    return send(
      () => this.pointage(operateurId, 'REPRISE', identite),
      () => this.reread(operateurId),
      'PRESENCE_ASSUREE',
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
    return this.api.read('/api/atelier/journees', { queryParams: { operateur: operateurId, size: 100 } });
  }
}
