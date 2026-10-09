import { lireEnTeteDImage } from './EnTeteDImage';

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

const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 50, 0, 50, 0]);

describe('lireEnTeteDImage', () => {
  it('should read a PNG and its dimensions from its header', () => {
    expect(lireEnTeteDImage(pngFixture(120, 80))).toEqual({ format: 'PNG', largeur: 120, hauteur: 80 });
  });

  it('should read a PNG that carries data after its header', () => {
    expect(lireEnTeteDImage(alourdiFixture(pngFixture(50, 50), 300))).toEqual({ format: 'PNG', largeur: 50, hauteur: 50 });
  });

  it('should read a JPEG and its dimensions from its frame, past the segments before it', () => {
    const avant = [...segmentJpegFixture(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]), ...segmentJpegFixture(0xc4, [0, 1, 2]), 0xff, 0x01];

    expect(lireEnTeteDImage(jpegFixture(64, 32, avant))).toEqual({ format: 'JPEG', largeur: 64, hauteur: 32 });
  });

  it.each([
    ['a GIF', GIF],
    ['a text', texteFixture()],
    ['a PNG cut before its dimensions', pngFixture(50, 50).slice(0, 20)],
    [
      'a PNG signature without its image header',
      Uint8Array.from([...pngFixture(50, 50).slice(0, 12), 0, 0, 0, 0, ...new Array<number>(12).fill(0)]),
    ],
    ['a JPEG without a frame', Uint8Array.from([0xff, 0xd8, ...segmentJpegFixture(0xe0, [1, 2, 3, 4, 5, 6, 7])])],
    ['a JPEG whose segments are broken', Uint8Array.from([0xff, 0xd8, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88])],
  ])('should not read %s as a logo image', (_cas, octets) => {
    expect(lireEnTeteDImage(octets)).toBeUndefined();
  });
});
