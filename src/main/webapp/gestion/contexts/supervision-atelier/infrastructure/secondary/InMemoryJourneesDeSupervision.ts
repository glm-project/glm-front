import { Page } from '@/app/shared/pagination/domain/Page';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { JourneesDeSupervisionPort } from '../../domain/JourneesDeSupervisionPort';

export class InMemoryJourneesDeSupervision extends JourneesDeSupervisionPort {
  private readonly page: Page<JourneeDeTravail> | Error;

  constructor(page: Page<JourneeDeTravail> | Error) {
    super();
    this.page = page instanceof Error ? page : new Page([...page.elements], page.totalCount);
  }

  read(): Promise<Page<JourneeDeTravail>> {
    return this.page instanceof Error ? Promise.reject(this.page) : Promise.resolve(this.page);
  }
}
