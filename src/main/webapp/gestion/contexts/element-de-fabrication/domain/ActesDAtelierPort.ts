import { Result } from '@/app/shared/result/domain/Result';
import { ElementDeFabricationId } from './ElementDeFabricationId';
import { RefusDActeDAtelier } from './RefusDActeDAtelier';
import { SuiviDuProduitId } from './SuiviDuProduitId';

export abstract class ActesDAtelierPort {
  abstract mettreALAtelier(element: ElementDeFabricationId): Promise<Result<void, RefusDActeDAtelier>>;
  abstract cloturer(suivi: SuiviDuProduitId): Promise<Result<void, RefusDActeDAtelier>>;
}
