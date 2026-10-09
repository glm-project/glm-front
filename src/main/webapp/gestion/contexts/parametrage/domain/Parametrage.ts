import { DureeMaxDActivite } from './DureeMaxDActivite';
import { VersionDuLogo } from './VersionDuLogo';

export class Parametrage {
  constructor(
    readonly dureeMaxDActivite: DureeMaxDActivite,
    readonly logo: VersionDuLogo | undefined,
  ) {}
}
