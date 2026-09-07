import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class TypeScriptChargementDeLAtelier {
  private readonly atelier = inject(AtelierCoordinator);

  referentielDisponible(): boolean {
    return this.atelier.referentiel() !== undefined;
  }

  connecte(): boolean {
    return this.atelier.connected();
  }

  charger(): Promise<void> {
    return this.atelier.synchronize();
  }
}
