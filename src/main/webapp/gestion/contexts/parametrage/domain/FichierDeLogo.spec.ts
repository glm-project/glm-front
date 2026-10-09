import { FichierDeLogo } from './FichierDeLogo';

const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR = [0x49, 0x48, 0x44, 0x52];

const sur16 = (valeur: number): number[] => [(valeur >> 8) & 0xff, valeur & 0xff];
const sur32 = (valeur: number): number[] => [...sur16(Math.floor(valeur / 0x10000)), ...sur16(valeur % 0x10000)];

const pngFixture = (largeur: number, hauteur: number): Uint8Array<ArrayBuffer> =>
  Uint8Array.from([...SIGNATURE_PNG, 0, 0, 0, 13, ...IHDR, ...sur32(largeur), ...sur32(hauteur), 8, 2, 0, 0, 0]);

const segmentJpegFixture = (marqueur: number, donnees: readonly number[]): number[] => [
  0xff,
  marqueur,
  ...sur16(donnees.length + 2),
  ...donnees,
];

const jpegFixture = (largeur: number, hauteur: number, avant: readonly number[] = []): Uint8Array<ArrayBuffer> =>
  Uint8Array.from([0xff, 0xd8, ...avant, ...segmentJpegFixture(0xc0, [8, ...sur16(hauteur), ...sur16(largeur), 3, 1, 0x11, 0])]);

const alourdiFixture = (octets: Uint8Array, poids: number): Uint8Array<ArrayBuffer> => {
  const alourdi = new Uint8Array(poids);
  alourdi.set(octets);
  return alourdi;
};

const texteFixture = (): Uint8Array<ArrayBuffer> => Uint8Array.from('ceci n’est pas une image', caractere => caractere.codePointAt(0) ?? 0);

describe('FichierDeLogo', () => {
  it.each([
    ['a PNG of 50 × 50 pixels', pngFixture(50, 50)],
    ['a JPEG of 50 × 50 pixels', jpegFixture(50, 50)],
    ['a logo of 20 Ko exactly', alourdiFixture(pngFixture(50, 50), 20 * 1024)],
  ])('should accept %s', (_cas, octets) => {
    expect(new FichierDeLogo(octets).refus()).toBeUndefined();
  });

  it.each([
    ['heavier than 20 Ko', alourdiFixture(pngFixture(50, 50), 20 * 1024 + 1), 'Le logo pèse 21 Ko, au plus 20 Ko.'],
    ['not a PNG nor a JPEG', texteFixture(), 'Le logo doit être une image PNG ou JPEG.'],
    ['wider than 50 pixels', pngFixture(120, 50), 'Le logo doit mesurer 50 × 50 pixels (reçu : 120 × 50).'],
    ['taller than 50 pixels', jpegFixture(50, 80), 'Le logo doit mesurer 50 × 50 pixels (reçu : 50 × 80).'],
  ])('should refuse a file %s, saying why', (_cas, octets, refus) => {
    expect(new FichierDeLogo(octets).refus()).toBe(refus);
  });
});
