import { FormatDImage, ImageLue, lireEnTeteDImage } from './EnTeteDImage';
import { ImageDuLogo } from './ImageDuLogo';

const COTE_MAXIMAL = 256;
const POIDS_MAXIMAL = 50 * 1024;
const OCTETS_PAR_KO = 1024;
const TYPES: Readonly<Record<FormatDImage, string>> = { PNG: 'image/png', JPEG: 'image/jpeg' };

const aLaBonneTaille = (image: ImageLue): boolean => image.largeur <= COTE_MAXIMAL && image.hauteur <= COTE_MAXIMAL;

export class FichierDeLogo {
  private readonly image: ImageLue | undefined;

  constructor(readonly octets: Uint8Array<ArrayBuffer>) {
    this.image = lireEnTeteDImage(octets);
  }

  refus(): string | undefined {
    if (this.octets.length > POIDS_MAXIMAL) {
      return `Le logo pèse ${Math.ceil(this.octets.length / OCTETS_PAR_KO)} Ko, au plus 50 Ko.`;
    }
    if (this.image === undefined) return 'Le logo doit être une image PNG ou JPEG.';
    if (!aLaBonneTaille(this.image)) {
      return `Le logo doit tenir dans 256 × 256 pixels (reçu : ${this.image.largeur} × ${this.image.hauteur}).`;
    }
    return undefined;
  }

  apercu(): ImageDuLogo {
    if (this.image === undefined) throw new Error('Un fichier qui n’est pas une image PNG ou JPEG n’a pas d’aperçu.');
    let binaire = '';
    for (const octet of this.octets) binaire += String.fromCodePoint(octet);
    return new ImageDuLogo(`data:${TYPES[this.image.format]};base64,${btoa(binaire)}`);
  }
}
