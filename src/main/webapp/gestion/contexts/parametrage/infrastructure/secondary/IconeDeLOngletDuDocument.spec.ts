import { TestBed } from '@angular/core/testing';
import { ImageDuLogo } from '../../domain/ImageDuLogo';
import { IconeDeLOngletDuDocument } from './IconeDeLOngletDuDocument';

const LOGO = new ImageDuLogo('data:image/png;base64,iVBORw0K');

describe('Tab icon of the document', () => {
  afterEach(() => {
    document.head.querySelector('link[rel="icon"]')?.remove();
  });

  it('should show the logo of the company in the tab', () => {
    givenTheGlmIcon();

    whenShowing(LOGO);

    thenTheTabShows(LOGO.adresse, null);
  });

  it('should give the GLM icon back once the logo is gone', () => {
    givenTheGlmIcon();
    const icone = whenShowing(LOGO);

    icone.afficher(undefined);

    thenTheTabShows('content/images/glm-gestion.svg', 'image/svg+xml');
  });

  it('should do nothing in a document without a tab icon', () => {
    whenShowing(LOGO);

    thenTheDocumentHasNoTabIcon();
  });

  const givenTheGlmIcon = (): void => {
    const lien = document.createElement('link');
    lien.rel = 'icon';
    lien.type = 'image/svg+xml';
    lien.setAttribute('href', 'content/images/glm-gestion.svg');
    document.head.append(lien);
  };

  const whenShowing = (image: ImageDuLogo): IconeDeLOngletDuDocument => {
    TestBed.configureTestingModule({ providers: [IconeDeLOngletDuDocument] });
    const icone = TestBed.inject(IconeDeLOngletDuDocument);
    icone.afficher(image);
    return icone;
  };

  const thenTheDocumentHasNoTabIcon = (): void => {
    expect(document.head.querySelector('link[rel="icon"]')).toBeNull();
  };

  const thenTheTabShows = (adresse: string, type: string | null): void => {
    const lien = document.head.querySelector('link[rel="icon"]');
    expect(lien?.getAttribute('href')).toBe(adresse);
    expect(lien?.getAttribute('type')).toBe(type);
  };
});
