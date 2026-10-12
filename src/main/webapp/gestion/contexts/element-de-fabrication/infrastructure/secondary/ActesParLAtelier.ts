import { err, ok, Result } from '@/app/shared/result/domain/Result';
import {
  RefusDeMiseALAtelier,
  RefusSurLePassage,
  TypeScriptActesDAtelier,
} from '@/gestion/contexts/atelier/infrastructure/primary/TypeScriptActesDAtelier';
import { inject, Injectable } from '@angular/core';
import { ActesDAtelierPort } from '../../domain/ActesDAtelierPort';
import { ElementDeFabricationId } from '../../domain/ElementDeFabricationId';
import { PassageIntrouvable } from '../../domain/PassageIntrouvable';
import { ProduitDejaALAtelier } from '../../domain/ProduitDejaALAtelier';
import { ProduitIntrouvable } from '../../domain/ProduitIntrouvable';
import { RefusDActeDAtelier } from '../../domain/RefusDActeDAtelier';
import { SuiviDuProduitId } from '../../domain/SuiviDuProduitId';

const REFUS_DE_MISE_A_L_ATELIER: Record<RefusDeMiseALAtelier, () => RefusDActeDAtelier> = {
  'element-deja-a-l-atelier': () => new ProduitDejaALAtelier(),
  'element-de-fabrication-introuvable': () => new ProduitIntrouvable(),
};

const REFUS_SUR_LE_PASSAGE: Record<RefusSurLePassage, () => RefusDActeDAtelier> = {
  'suivi-introuvable': () => new PassageIntrouvable(),
};

const resultatDe = <Code extends string>(
  code: Code | undefined,
  refus: Record<Code, () => RefusDActeDAtelier>,
): Result<void, RefusDActeDAtelier> => (code === undefined ? ok(undefined) : err(refus[code]()));

@Injectable()
export class ActesParLAtelier extends ActesDAtelierPort {
  private readonly atelier = inject(TypeScriptActesDAtelier);

  override async mettreALAtelier(element: ElementDeFabricationId): Promise<Result<void, RefusDActeDAtelier>> {
    return resultatDe(await this.atelier.mettreALAtelier(element.value), REFUS_DE_MISE_A_L_ATELIER);
  }

  override async cloturer(suivi: SuiviDuProduitId): Promise<Result<void, RefusDActeDAtelier>> {
    return resultatDe(await this.atelier.cloturer(suivi.value), REFUS_SUR_LE_PASSAGE);
  }
}
