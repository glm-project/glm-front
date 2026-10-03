import { ElementChiffre } from './ElementChiffre';

describe('ElementChiffre', () => {
  it.each([
    [{ reference: 'M24-0655', libelle: 'Support latéral' }, 'M24-0655'],
    [{}, 'OF-2026-000001'],
  ])('should designate the element by its company reference or its internal name %j', (designation, expected) => {
    const element = new ElementChiffre('OF-2026-000001', 'ORDRE_DE_FABRICATION', designation);

    expect(element.numero()).toBe(expected);
  });
  it('should carry the name and the type the report resolved', () => {
    const element = new ElementChiffre('OF-2026-000001', 'ORDRE_DE_FABRICATION');

    expect([element.nom, element.type]).toEqual(['OF-2026-000001', 'ORDRE_DE_FABRICATION']);
  });

  it.each(['', '   '])('should refuse the empty name %p, which designates nothing', nom => {
    expect(() => new ElementChiffre(nom, 'PRODUIT')).toThrow('Le nom de l’élément reçu du serveur est vide.');
  });
});
