import { ElementChiffre } from './ElementChiffre';

describe('ElementChiffre', () => {
  it('should carry the name and the type the report resolved', () => {
    const element = new ElementChiffre('OF-2026-000001', 'ORDRE_DE_FABRICATION');

    expect([element.nom, element.type]).toEqual(['OF-2026-000001', 'ORDRE_DE_FABRICATION']);
  });

  it.each(['', '   '])('should refuse the empty name %p, which designates nothing', nom => {
    expect(() => new ElementChiffre(nom, 'PRODUIT')).toThrow('Le nom de l’élément reçu du serveur est vide.');
  });
});
