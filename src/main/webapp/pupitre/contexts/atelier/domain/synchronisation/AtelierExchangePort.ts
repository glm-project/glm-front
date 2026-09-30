import { ConflitDuPupitre, GesteDePointage, ReferentielDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '../refus/RefusDePublication';
import { Result } from './Result';

export interface PublicationAcceptee {
  readonly conflits: readonly ConflitDuPupitre[];
}

export abstract class AtelierExchangePort {
  abstract referentiel(): Promise<ReferentielDuPupitre>;

  abstract send(geste: GesteDePointage): Promise<Result<PublicationAcceptee, RefusDePublication>>;

  abstract reread(geste: GesteDePointage): Promise<void>;
}
