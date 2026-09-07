import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class TypeScriptChargementDeLAtelier {
  private readonly atelier = inject(AtelierCoordinator);
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);

  referentielDisponible(): boolean {
    return this.etatHorsLigne.referentiel() !== undefined;
  }

  connecte(): boolean {
    return this.etatHorsLigne.connected();
  }

  charger(): Promise<void> {
    return this.atelier.synchronize();
  }
}
