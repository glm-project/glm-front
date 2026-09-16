import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { ElementALAtelier } from './ElementALAtelier';
import { ElementEngageId } from './ElementEngageId';
import { RefusMiseALAtelier } from './RefusMiseALAtelier';
import { RequeteAtelier } from './RequeteAtelier';
import { SuiviId } from './SuiviId';
import { SuiviIntrouvable } from './SuiviIntrouvable';

export abstract class AtelierPort {
  abstract elements(requete: RequeteAtelier): Promise<Page<ElementALAtelier>>;
  abstract mettreALAtelier(element: ElementEngageId): Promise<Result<void, RefusMiseALAtelier>>;
  abstract cloturer(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>>;
  abstract rouvrir(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>>;
}
