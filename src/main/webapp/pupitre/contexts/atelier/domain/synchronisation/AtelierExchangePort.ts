import { GesteDAtelier, ReferentielDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';

export abstract class AtelierExchangePort {
  abstract referentiel(): Promise<ReferentielDuPupitre>;

  abstract send(geste: GesteDAtelier): Promise<void>;

  abstract reread(geste: GesteDAtelier): Promise<void>;
}
