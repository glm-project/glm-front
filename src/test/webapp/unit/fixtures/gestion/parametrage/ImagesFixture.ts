const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR = [0x49, 0x48, 0x44, 0x52];

const sur16 = (valeur: number): number[] => [(valeur >> 8) & 0xff, valeur & 0xff];
const sur32 = (valeur: number): number[] => [...sur16(Math.floor(valeur / 0x10000)), ...sur16(valeur % 0x10000)];

export const pngFixture = (largeur: number, hauteur: number): Uint8Array<ArrayBuffer> =>
  Uint8Array.from([...SIGNATURE_PNG, 0, 0, 0, 13, ...IHDR, ...sur32(largeur), ...sur32(hauteur), 8, 2, 0, 0, 0]);
