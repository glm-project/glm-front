import { inject, Injectable, signal } from '@angular/core';
import { ImageDuLogo } from '../domain/ImageDuLogo';
import { ParametragePort } from '../domain/ParametragePort';
import { VersionDuLogo } from '../domain/VersionDuLogo';

@Injectable()
export class LogoAffiche {
  private readonly port = inject(ParametragePort);
  private readonly courante = signal<ImageDuLogo | undefined>(undefined);

  readonly image = this.courante.asReadonly();

  async lire(): Promise<void> {
    await this.montrer((await this.port.parametrage()).logo);
  }

  async montrer(version: VersionDuLogo | undefined): Promise<void> {
    if (version === undefined) {
      this.courante.set(undefined);
      return;
    }
    try {
      this.courante.set(await this.port.imageDuLogo(version));
    } catch (failure) {
      this.courante.set(undefined);
      throw failure;
    }
  }
}
