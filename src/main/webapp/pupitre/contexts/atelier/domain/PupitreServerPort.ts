import { LocalGeste, ReferentielDuPupitre } from './LocalPupitreState';

export abstract class PupitreServerPort {
  abstract referentiel(): Promise<ReferentielDuPupitre>;

  abstract send(geste: LocalGeste): Promise<void>;

  abstract reread(geste: LocalGeste): Promise<void>;
}
