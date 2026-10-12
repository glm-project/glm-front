import { Result } from '@/app/shared/result/domain/Result';
import { ElementDeFabricationId } from './ElementDeFabricationId';
import { RefusDActeDAtelier } from './RefusDActeDAtelier';

export abstract class ActesDAtelierPort {
  abstract mettreALAtelier(element: ElementDeFabricationId): Promise<Result<void, RefusDActeDAtelier>>;
}
