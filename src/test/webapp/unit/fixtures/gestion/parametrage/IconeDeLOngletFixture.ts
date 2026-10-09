import { IconeDeLOnglet } from '@/gestion/contexts/parametrage/domain/IconeDeLOnglet';
import { ImageDuLogo } from '@/gestion/contexts/parametrage/domain/ImageDuLogo';

export class IconeDeLOngletFixture extends IconeDeLOnglet {
  readonly affichees: (ImageDuLogo | undefined)[] = [];

  override afficher(image: ImageDuLogo | undefined): void {
    this.affichees.push(image);
  }
}
