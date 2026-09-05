import { GesteLocal, ReferentielDuPupitre } from './PupitreLocal';

export abstract class ServeurDuPupitrePort {
  abstract referentiel(): Promise<ReferentielDuPupitre>;

  abstract send(geste: GesteLocal): Promise<void>;

  abstract reread(geste: GesteLocal): Promise<void>;
}
