import { DureeTravaillee } from '../duree/DureeTravaillee';
import { ElementDuReleve } from './ElementDuReleve';
import { ElementReleveId } from './ElementReleveId';
import { PosteDeLElement } from './PosteDeLElement';
import { PosteReleveId } from './PosteReleveId';

const posteFixture = (id: string, libelle: string, nature?: string): PosteDeLElement =>
  new PosteDeLElement(new PosteReleveId(id), libelle, nature);

const elementFixture = (postes: readonly PosteDeLElement[]): ElementDuReleve =>
  new ElementDuReleve({
    id: new ElementReleveId('carter'),
    type: 'PRODUIT',
    nom: 'PRD-2026-000015',
    reference: undefined,
    description: undefined,
    duree: new DureeTravaillee('PT0S'),
    dureeNonConformite: new DureeTravaillee('PT0S'),
    postes,
  });

describe('ElementDuReleve', () => {
  const dmu = posteFixture('dmu', 'DMU 50', 'Fraisage');
  const mazak = posteFixture('mazak', 'Mazak QT-200', 'Tournage');

  it('should carry a workstation it was worked from', () => {
    expect(elementFixture([dmu, mazak]).porte(new PosteReleveId('mazak'))).toBe(true);
  });

  it('should not carry a workstation it was never worked from', () => {
    expect(elementFixture([dmu]).porte(new PosteReleveId('mazak'))).toBe(false);
  });

  it('should name a workstation by its own label among the workstations it carries', () => {
    expect(elementFixture([dmu, mazak]).libelleDuPoste(new PosteReleveId('mazak'))).toBe('Mazak QT-200');
  });

  it('should name a workstation once when it carries it for several natures', () => {
    const element = elementFixture([dmu, posteFixture('dmu', 'DMU 50', 'Perçage')]);

    expect(element.libelleDuPoste(new PosteReleveId('dmu'))).toBe('DMU 50');
  });

  it('should name no workstation it does not carry', () => {
    expect(elementFixture([dmu]).libelleDuPoste(new PosteReleveId('mazak'))).toBeUndefined();
  });

  it('should name no workstation when none is asked for', () => {
    expect(elementFixture([dmu]).libelleDuPoste(undefined)).toBeUndefined();
  });
});
