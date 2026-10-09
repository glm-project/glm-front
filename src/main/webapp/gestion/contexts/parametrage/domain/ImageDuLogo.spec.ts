import { ImageDuLogo } from './ImageDuLogo';

describe('ImageDuLogo', () => {
  it.each(['data:image/png;base64,iVBORw0K', 'data:image/jpeg;base64,/9j/4A=='])('should retain the inline image %s', adresse => {
    const image = new ImageDuLogo(adresse);

    expect(image.adresse).toBe(adresse);
  });

  it.each(['https://exemple.fr/logo.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,<script>', 'javascript:alert(1)'])(
    'should refuse anything but an inline PNG or JPEG: %s',
    adresse => {
      expect(() => new ImageDuLogo(adresse)).toThrow('Le logo doit être une image PNG ou JPEG en ligne.');
    },
  );
});
