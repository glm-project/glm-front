import { Page } from '@/app/shared/pagination/domain/Page';
import { JourneeDeTravail } from './JourneeDeTravail';

export abstract class JourneesDeSupervisionPort {
  abstract read(): Promise<Page<JourneeDeTravail>>;
}
