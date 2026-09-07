import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TypeScriptChargementDeLAtelier } from '@/pupitre/contexts/atelier/infrastructure/primary/TypeScriptChargementDeLAtelier';
import { ChargementDeLAtelier, ChargementDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class AtelierChargement extends ChargementDeLAtelierPort {
  private readonly atelier = inject(TypeScriptChargementDeLAtelier);
  private readonly errorHandler = inject(ErrorHandlerPort);

  override etat(): ChargementDeLAtelier {
    return { referentielDisponible: this.atelier.referentielDisponible(), connecte: this.atelier.connecte() };
  }

  override charger(): Promise<void> {
    return this.atelier.charger().catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
