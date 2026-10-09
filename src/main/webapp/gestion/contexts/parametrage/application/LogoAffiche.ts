import { inject, Injectable, signal } from '@angular/core';
import { IconeDeLOnglet } from '../domain/IconeDeLOnglet';
import { ImageDuLogo } from '../domain/ImageDuLogo';
import { ParametragePort } from '../domain/ParametragePort';
import { VersionDuLogo } from '../domain/VersionDuLogo';

@Injectable()
export class LogoAffiche {
  private readonly port = inject(ParametragePort);
  private readonly icone = inject(IconeDeLOnglet);
  private readonly courante = signal<ImageDuLogo | undefined>(undefined);

  readonly image = this.courante.asReadonly();

  async lire(): Promise<void> {
    await this.montrer((await this.port.parametrage()).logo);
  }

  async montrer(version: VersionDuLogo | undefined): Promise<void> {
    if (version === undefined) {
      this.afficher(undefined);
      return;
    }
    try {
      this.afficher(await this.port.imageDuLogo(version));
    } catch (failure) {
      this.afficher(undefined);
      throw failure;
    }
  }

  private afficher(image: ImageDuLogo | undefined): void {
    this.courante.set(image);
    this.icone.afficher(image);
  }
}
