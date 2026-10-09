import { DureeMaxDActivite } from './DureeMaxDActivite';
import { ImageDuLogo } from './ImageDuLogo';
import { Parametrage } from './Parametrage';
import { VersionDuLogo } from './VersionDuLogo';

export abstract class ParametragePort {
  abstract parametrage(): Promise<Parametrage>;
  abstract fixerDureeMaxDActivite(duree: DureeMaxDActivite): Promise<void>;
  abstract imageDuLogo(version: VersionDuLogo): Promise<ImageDuLogo>;
}
