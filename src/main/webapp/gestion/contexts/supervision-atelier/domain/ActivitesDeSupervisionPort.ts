import { Page } from '@/app/shared/pagination/domain/Page';
import { ActiviteDeSupervision } from './ActiviteDeSupervision';

export abstract class ActivitesDeSupervisionPort {
  abstract read(): Promise<Page<ActiviteDeSupervision>>;
}
