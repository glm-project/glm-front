export type FormatDImage = 'PNG' | 'JPEG';

export interface ImageLue {
  readonly format: FormatDImage;
  readonly largeur: number;
  readonly hauteur: number;
}

const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EN_TETE_PNG = [0x49, 0x48, 0x44, 0x52];
const FIN_DES_DIMENSIONS_PNG = 24;
const MARQUEUR = 0xff;
const DEBUT_JPEG = 0xd8;
const FIN_DES_DIMENSIONS_JPEG = 9;
const SANS_LONGUEUR = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);
const NON_TRAMES = new Set([0xc4, 0xc8, 0xcc]);

const commencePar = (octets: Uint8Array, attendus: readonly number[], depuis = 0): boolean =>
  attendus.every((octet, rang) => octets[depuis + rang] === octet);

const estUneTrame = (marqueur: number): boolean => marqueur >= 0xc0 && marqueur <= 0xcf && !NON_TRAMES.has(marqueur);

const lirePng = (octets: Uint8Array): ImageLue | undefined => {
  if (octets.length < FIN_DES_DIMENSIONS_PNG) return undefined;
  if (!commencePar(octets, EN_TETE_PNG, 12)) return undefined;
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  return { format: 'PNG', largeur: vue.getUint32(16), hauteur: vue.getUint32(20) };
};

const lireJpeg = (octets: Uint8Array): ImageLue | undefined => {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  let rang = 2;
  while (rang + FIN_DES_DIMENSIONS_JPEG <= octets.length) {
    if (vue.getUint8(rang) !== MARQUEUR) return undefined;
    const marqueur = vue.getUint8(rang + 1);
    if (estUneTrame(marqueur)) {
      return { format: 'JPEG', largeur: vue.getUint16(rang + 7), hauteur: vue.getUint16(rang + 5) };
    }
    rang += SANS_LONGUEUR.has(marqueur) ? 2 : 2 + vue.getUint16(rang + 2);
  }
  return undefined;
};

export const lireEnTeteDImage = (octets: Uint8Array): ImageLue | undefined => {
  if (commencePar(octets, SIGNATURE_PNG)) return lirePng(octets);
  if (commencePar(octets, [MARQUEUR, DEBUT_JPEG])) return lireJpeg(octets);
  return undefined;
};
