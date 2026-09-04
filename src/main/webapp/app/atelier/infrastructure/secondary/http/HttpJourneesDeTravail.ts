import { JourneesDeTravailPort } from '@/app/atelier/domain/JourneesDeTravailPort';
import { TypeDePresence } from '@/app/atelier/domain/TypeDePresence';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { inject, Injectable } from '@angular/core';
import { envoyer, envoyerEnAbsorbant } from '../envoiDAtelier';

const UNE_REPRISE: TypeDePresence = 'REPRISE';

@Injectable()
export class HttpJourneesDeTravail extends JourneesDeTravailPort {
  private readonly api = inject(ClientApi);

  override sAssurerQueLOperateurEstArrive(operateurId: string): Promise<void> {
    return envoyerEnAbsorbant('journee-de-travail-deja-ouverte', () =>
      this.api.ecrire('/api/atelier/journees', { corps: { operateur: operateurId } }),
    );
  }

  override sAssurerQueLOperateurEstPresent(operateurId: string): Promise<void> {
    return envoyerEnAbsorbant('transition-de-presence-interdite', () => this.pointage(operateurId, UNE_REPRISE));
  }

  override pointerLaPresence(operateurId: string, type: TypeDePresence): Promise<void> {
    return envoyer(() => this.pointage(operateurId, type));
  }

  private pointage(operateurId: string, type: TypeDePresence): Promise<unknown> {
    return this.api.ecrire('/api/atelier/journees/pointages', { corps: { operateur: operateurId, type } });
  }
}
