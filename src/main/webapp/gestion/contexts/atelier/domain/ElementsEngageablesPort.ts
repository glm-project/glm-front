import { Page } from '@/app/shared/pagination/domain/Page';
import { ElementEngageable } from './ElementEngageable';
import { ElementEngageId } from './ElementEngageId';
import { RequeteEngageables } from './RequeteEngageables';

export abstract class ElementsEngageablesPort {
  abstract elements(requete: RequeteEngageables): Promise<Page<ElementEngageable>>;
  abstract element(id: ElementEngageId): Promise<ElementEngageable | undefined>;
}
