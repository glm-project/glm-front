import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TypeScriptChargementDeLAtelier } from '@/pupitre/contexts/atelier/infrastructure/primary/TypeScriptChargementDeLAtelier';
import {
  ChargementDeLAtelier,
  ChargementDeLAtelierPort,
  IssueDuChargementDeLAtelier,
} from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { inject, Injectable } from '@angular/core';

const ISSUE_PAR_DISPONIBILITE: Readonly<Record<`${boolean}`, IssueDuChargementDeLAtelier>> = {
  false: 'ECHEC',
  true: 'CHARGE',
};

@Injectable()
export class AtelierChargement extends ChargementDeLAtelierPort {
  private readonly atelier = inject(TypeScriptChargementDeLAtelier);
  private readonly errorHandler = inject(ErrorHandlerPort);

  override etat(): ChargementDeLAtelier {
    return { referentielDisponible: this.atelier.referentielDisponible(), connecte: this.atelier.connecte() };
  }

  override charger(): Promise<IssueDuChargementDeLAtelier> {
    return this.atelier
      .charger()
      .then(() => ISSUE_PAR_DISPONIBILITE[`${this.atelier.referentielDisponible()}`])
      .catch((failure: unknown) => {
        this.errorHandler.handleError(failure);
        return 'ECHEC';
      });
  }
}
