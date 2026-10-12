import { Result } from '@/app/shared/result/domain/Result';
import { ElementEngageId } from './ElementEngageId';
import { RefusMiseALAtelier } from './RefusMiseALAtelier';
import { SuiviId } from './SuiviId';
import { SuiviIntrouvable } from './SuiviIntrouvable';

export abstract class AtelierPort {
  abstract mettreALAtelier(element: ElementEngageId): Promise<Result<void, RefusMiseALAtelier>>;
  abstract cloturer(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>>;
  abstract rouvrir(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>>;
}
