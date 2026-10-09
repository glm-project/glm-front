import { DureeMaxDActivite } from './DureeMaxDActivite';
import { Parametrage } from './Parametrage';

export abstract class ParametragePort {
  abstract parametrage(): Promise<Parametrage>;
  abstract fixerDureeMaxDActivite(duree: DureeMaxDActivite): Promise<void>;
}
