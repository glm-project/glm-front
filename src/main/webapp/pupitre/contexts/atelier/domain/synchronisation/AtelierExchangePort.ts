import { GesteDAtelier, ReferentielDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '../refus/RefusDePublication';
import { Result } from './Result';

export abstract class AtelierExchangePort {
  abstract referentiel(): Promise<ReferentielDuPupitre>;

  abstract send(geste: GesteDAtelier): Promise<Result<void, RefusDePublication>>;

  abstract reread(geste: GesteDAtelier): Promise<void>;
}
