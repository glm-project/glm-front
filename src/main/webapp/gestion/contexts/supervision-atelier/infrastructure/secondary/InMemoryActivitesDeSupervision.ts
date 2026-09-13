import { Page } from '@/app/shared/pagination/domain/Page';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { ActivitesDeSupervisionPort } from '../../domain/ActivitesDeSupervisionPort';

export class InMemoryActivitesDeSupervision extends ActivitesDeSupervisionPort {
  private readonly page: Page<ActiviteDeSupervision> | Error;

  constructor(page: Page<ActiviteDeSupervision> | Error) {
    super();
    this.page = page instanceof Error ? page : new Page([...page.elements], page.totalCount);
  }

  read(): Promise<Page<ActiviteDeSupervision>> {
    return this.page instanceof Error ? Promise.reject(this.page) : Promise.resolve(this.page);
  }
}
