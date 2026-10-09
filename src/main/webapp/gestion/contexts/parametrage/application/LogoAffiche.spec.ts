import { TestBed } from '@angular/core/testing';
import { IconeDeLOngletFixture } from '@test/unit/fixtures/gestion/parametrage/IconeDeLOngletFixture';
import { ParametrageFixture } from '@test/unit/fixtures/gestion/parametrage/ParametrageFixture';
import { IconeDeLOnglet } from '../domain/IconeDeLOnglet';
import { ImageDuLogo } from '../domain/ImageDuLogo';
import { ParametragePort } from '../domain/ParametragePort';
import { VersionDuLogo } from '../domain/VersionDuLogo';
import { LogoAffiche } from './LogoAffiche';

const LOGO = { version: new VersionDuLogo('0123456789abcdef'), image: new ImageDuLogo('data:image/png;base64,iVBORw0K') };
const AUTRE_LOGO = { version: new VersionDuLogo('fedcba9876543210'), image: new ImageDuLogo('data:image/jpeg;base64,/9j/4A') };

describe('Logo shown by the gestion', () => {
  let port: ParametrageFixture;
  let icone: IconeDeLOngletFixture;
  let affiche: LogoAffiche;

  beforeEach(() => {
    port = new ParametrageFixture();
    icone = new IconeDeLOngletFixture();
    TestBed.configureTestingModule({
      providers: [LogoAffiche, { provide: ParametragePort, useValue: port }, { provide: IconeDeLOnglet, useValue: icone }],
    });
    affiche = TestBed.inject(LogoAffiche);
  });

  it('should show nothing before the logo is read', () => {
    port.logo = LOGO;

    expect(affiche.image()).toBeUndefined();
  });

  it('should show the logo the company has', async () => {
    port.logo = LOGO;

    await affiche.lire();

    expect(affiche.image()).toBe(LOGO.image);
    expect(icone.affichees).toEqual([LOGO.image]);
  });

  it('should show nothing for a company without a logo', async () => {
    await affiche.lire();

    expect(affiche.image()).toBeUndefined();
  });

  it('should show another version as soon as it is given', async () => {
    port.logo = LOGO;
    await affiche.lire();
    port.logo = AUTRE_LOGO;

    await affiche.montrer(AUTRE_LOGO.version);

    expect(affiche.image()).toBe(AUTRE_LOGO.image);
  });

  it('should show nothing once the logo is removed', async () => {
    port.logo = LOGO;
    await affiche.lire();

    await affiche.montrer(undefined);

    expect(affiche.image()).toBeUndefined();
    expect(icone.affichees).toEqual([LOGO.image, undefined]);
  });

  it('should show nothing and fail when the image cannot be read', async () => {
    port.logo = LOGO;
    await affiche.lire();
    port.imageFailure = new Error('panne');

    await expect(affiche.montrer(LOGO.version)).rejects.toEqual(new Error('panne'));

    expect(affiche.image()).toBeUndefined();
    expect(icone.affichees).toEqual([LOGO.image, undefined]);
  });
});
