import { ImageLue, lireEnTeteDImage } from './EnTeteDImage';

const COTE_MAXIMAL = 256;
const POIDS_MAXIMAL = 50 * 1024;
const OCTETS_PAR_KO = 1024;

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
}
