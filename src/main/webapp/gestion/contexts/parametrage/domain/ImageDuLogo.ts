const IMAGE_EN_LIGNE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

export class ImageDuLogo {
  constructor(readonly adresse: string) {
    if (!IMAGE_EN_LIGNE.test(adresse)) {
      throw new Error('Le logo doit être une image PNG ou JPEG en ligne.');
    }
  }
}
