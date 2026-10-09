import { DOCUMENT, inject, Injectable } from '@angular/core';
import { IconeDeLOnglet } from '../../domain/IconeDeLOnglet';
import { ImageDuLogo } from '../../domain/ImageDuLogo';

@Injectable()
export class IconeDeLOngletDuDocument extends IconeDeLOnglet {
  private readonly lien = inject(DOCUMENT).head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  private readonly adresseParDefaut = this.lien?.getAttribute('href') ?? '';
  private readonly typeParDefaut = this.lien?.getAttribute('type') ?? '';

  override afficher(image: ImageDuLogo | undefined): void {
    if (this.lien === null) return;
    if (image === undefined) {
      this.lien.setAttribute('href', this.adresseParDefaut);
      this.lien.setAttribute('type', this.typeParDefaut);
      return;
    }
    this.lien.setAttribute('href', image.adresse);
    this.lien.removeAttribute('type');
  }
}
