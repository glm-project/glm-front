import { ImageLue, lireEnTeteDImage } from './EnTeteDImage';

const COTE = 50;
const POIDS_MAXIMAL = 20 * 1024;
const OCTETS_PAR_KO = 1024;

const aLaBonneTaille = (image: ImageLue): boolean => image.largeur === COTE && image.hauteur === COTE;

export class FichierDeLogo {
  private readonly image: ImageLue | undefined;

  constructor(readonly octets: Uint8Array<ArrayBuffer>) {
    this.image = lireEnTeteDImage(octets);
  }

  refus(): string | undefined {
    if (this.octets.length > POIDS_MAXIMAL) {
      return `Le logo pèse ${Math.ceil(this.octets.length / OCTETS_PAR_KO)} Ko, au plus 20 Ko.`;
    }
    if (this.image === undefined) return 'Le logo doit être une image PNG ou JPEG.';
    if (!aLaBonneTaille(this.image)) {
      return `Le logo doit mesurer 50 × 50 pixels (reçu : ${this.image.largeur} × ${this.image.hauteur}).`;
    }
    return undefined;
  }
}
