import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class TypeScriptChargementDeLAtelier {
  private readonly pupitre = inject(OfflinePupitre);

  referentielDisponible(): boolean {
    return this.pupitre.referentiel() !== undefined;
  }

  connecte(): boolean {
    return this.pupitre.connected();
  }

  charger(): Promise<void> {
    return this.pupitre.synchronize();
  }
}
