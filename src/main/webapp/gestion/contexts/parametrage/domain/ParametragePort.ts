import { Result } from '@/app/shared/result/domain/Result';
import { DureeMaxDActivite } from './DureeMaxDActivite';
import { FichierDeLogo } from './FichierDeLogo';
import { ImageDuLogo } from './ImageDuLogo';
import { LogoRefuse } from './LogoRefuse';
import { Parametrage } from './Parametrage';
import { VersionDuLogo } from './VersionDuLogo';

export abstract class ParametragePort {
  abstract parametrage(): Promise<Parametrage>;
  abstract fixerDureeMaxDActivite(duree: DureeMaxDActivite): Promise<void>;
  abstract imageDuLogo(version: VersionDuLogo): Promise<ImageDuLogo>;
  abstract retirerLogo(): Promise<void>;
  abstract deposerLogo(fichier: FichierDeLogo): Promise<Result<VersionDuLogo, LogoRefuse>>;
}
