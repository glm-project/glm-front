import { GesteDePointage, ReferentielDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '../refus/RefusDePublication';
import { Result } from './Result';

export abstract class AtelierExchangePort {
  abstract referentiel(): Promise<ReferentielDuPupitre>;

  abstract imageDuLogo(version: string): Promise<string>;

  abstract send(geste: GesteDePointage): Promise<Result<void, RefusDePublication>>;

  abstract reread(geste: GesteDePointage): Promise<void>;
}
