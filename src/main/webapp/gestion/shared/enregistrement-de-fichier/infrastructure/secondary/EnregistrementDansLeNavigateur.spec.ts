import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EnregistrementDansLeNavigateur } from './EnregistrementDansLeNavigateur';

const ADRESSE = 'blob:http://localhost/fichier';

class AdressesDeFichierFixture {
  readonly creees: Blob[] = [];
  readonly revoquees: string[] = [];

  installer(): void {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (contenu: Blob): string => {
        this.creees.push(contenu);
        return ADRESSE;
      },
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: (adresse: string): void => {
        this.revoquees.push(adresse);
      },
    });
  }

  desinstaller(): void {
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  }
}

class ClicsFixture {
  readonly liens: { readonly nom: string; readonly adresse: string }[] = [];

  private readonly ecoute = (evenement: MouseEvent): void => {
    const lien = evenement.target as HTMLAnchorElement;
    evenement.preventDefault();
    this.liens.push({ nom: lien.download, adresse: lien.href });
  };

  installer(): void {
    document.addEventListener('click', this.ecoute);
  }

  desinstaller(): void {
    document.removeEventListener('click', this.ecoute);
  }
}

describe('EnregistrementDansLeNavigateur', () => {
  let enregistrement: EnregistrementDansLeNavigateur;
  let adresses: AdressesDeFichierFixture;
  let clics: ClicsFixture;

  beforeEach(() => {
    adresses = new AdressesDeFichierFixture();
    clics = new ClicsFixture();
    adresses.installer();
    clics.installer();
    TestBed.configureTestingModule({ providers: [EnregistrementDansLeNavigateur] });
    enregistrement = TestBed.inject(EnregistrementDansLeNavigateur);
  });

  afterEach(() => {
    clics.desinstaller();
    adresses.desinstaller();
  });

  it('should hand the file to the browser under its name, then release it', async () => {
    const contenu = new Blob(['classeur']);

    enregistrement.enregistre({ nom: 'cout-de-revient-OF-2026-000001.xlsx', contenu });
    await whenTheBrowserIsDone();

    expect(adresses.creees).toEqual([contenu]);
    expect(clics.liens).toEqual([{ nom: 'cout-de-revient-OF-2026-000001.xlsx', adresse: ADRESSE }]);
    expect(adresses.revoquees).toEqual([ADRESSE]);
    thenNoLinkIsLeftInThePage();
  });

  const thenNoLinkIsLeftInThePage = (): void => {
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  };

  const whenTheBrowserIsDone = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
});
