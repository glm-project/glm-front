import { ElementDeFabrication } from './ElementDeFabrication';
import { ElementDeFabricationId } from './ElementDeFabricationId';
import { LibelleDElement } from './LibelleDElement';
import { NomDElement } from './NomDElement';
import { ReferenceDElement } from './ReferenceDElement';

describe('ElementDeFabrication', () => {
  it('should be designated by the company number when it has one', () => {
    const element = elementFixture(new ReferenceDElement('1015'));

    expect(element.numero()).toBe('1015');
  });

  it('should fall back to the number produced by the domain when no company number is given', () => {
    const element = elementFixture(undefined);

    expect(element.numero()).toBe('PRD-2026-000001');
  });

  it('should keep the fiche it was built with', () => {
    const element = elementFixture(new ReferenceDElement('1015'));

    expect(element.id.value).toBe('moule-1');
    expect(element.type).toBe('PRODUIT');
    expect(element.nom.value).toBe('PRD-2026-000001');
    expect(element.libelle?.value).toBe('Moule de capot');
  });

  const elementFixture = (reference: ReferenceDElement | undefined): ElementDeFabrication =>
    new ElementDeFabrication(new ElementDeFabricationId('moule-1'), {
      type: 'PRODUIT',
      nom: new NomDElement('PRD-2026-000001'),
      reference,
      libelle: new LibelleDElement('Moule de capot'),
    });
});
