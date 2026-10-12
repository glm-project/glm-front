import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { RefusDeMiseALAtelier, TypeScriptActesDAtelier } from '@/gestion/contexts/atelier/infrastructure/primary/TypeScriptActesDAtelier';
import { inject, Injectable } from '@angular/core';
import { ActesDAtelierPort } from '../../domain/ActesDAtelierPort';
import { ElementDeFabricationId } from '../../domain/ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ProduitDejaALAtelier } from '../../domain/ProduitDejaALAtelier';
import { RefusDActeDAtelier } from '../../domain/RefusDActeDAtelier';

const REFUS_DE_MISE_A_L_ATELIER: Record<RefusDeMiseALAtelier, () => RefusDActeDAtelier> = {
  'element-deja-a-l-atelier': () => new ProduitDejaALAtelier(),
  'element-de-fabrication-introuvable': () => new ElementDeFabricationIntrouvable(),
};

@Injectable()
export class ActesParLAtelier extends ActesDAtelierPort {
  private readonly atelier = inject(TypeScriptActesDAtelier);

  override async mettreALAtelier(element: ElementDeFabricationId): Promise<Result<void, RefusDActeDAtelier>> {
    const refus = await this.atelier.mettreALAtelier(element.value);
    return refus === undefined ? ok(undefined) : err(REFUS_DE_MISE_A_L_ATELIER[refus]());
  }
}
