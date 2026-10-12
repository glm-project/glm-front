import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { AtelierPort } from '../../domain/AtelierPort';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ElementDejaALAtelier } from '../../domain/ElementDejaALAtelier';
import { ElementEngageId } from '../../domain/ElementEngageId';
import { RefusMiseALAtelier } from '../../domain/RefusMiseALAtelier';
import { SuiviId } from '../../domain/SuiviId';
import { SuiviIntrouvable } from '../../domain/SuiviIntrouvable';

const refusMiseALAtelier = (urn: string | undefined): RefusMiseALAtelier | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:atelier:element-deja-engage':
      return new ElementDejaALAtelier();
    case 'urn:glm:erreur:atelier:element-de-fabrication-introuvable':
      return new ElementDeFabricationIntrouvable();
    default:
      return undefined;
  }
};

const refusSurLeSuivi = (urn: string | undefined): SuiviIntrouvable | undefined =>
  urn === 'urn:glm:erreur:atelier:suivi-d-atelier-introuvable' ? new SuiviIntrouvable() : undefined;

@Injectable()
export class HttpAtelier extends AtelierPort {
  private readonly api = inject(ApiClient);

  override mettreALAtelier(element: ElementEngageId): Promise<Result<void, RefusMiseALAtelier>> {
    return this.execute(this.api.write('/api/atelier/suivis', { body: { element: element.value } }), refusMiseALAtelier);
  }

  override cloturer(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>> {
    return this.execute(
      this.api.update('/api/atelier/suivis/{id}/cloture', { pathParams: { id: suivi.value }, body: {} }),
      refusSurLeSuivi,
    );
  }

  override rouvrir(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>> {
    return this.execute(this.api.delete('/api/atelier/suivis/{id}/cloture', { pathParams: { id: suivi.value } }), refusSurLeSuivi);
  }

  private async execute<Refus>(
    operation: Promise<unknown>,
    translate: (urn: string | undefined) => Refus | undefined,
  ): Promise<Result<void, Refus>> {
    try {
      await operation;
      return ok(undefined);
    } catch (failure) {
      const refus = translate(findApiErrorIn(failure)?.urn);
      if (refus === undefined) {
        throw failure;
      }
      return err(refus);
    }
  }
}
