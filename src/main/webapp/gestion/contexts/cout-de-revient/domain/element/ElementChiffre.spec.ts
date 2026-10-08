import { CategorieDElementChiffre } from './CategorieDElementChiffre';
import { ElementChiffre } from './ElementChiffre';

describe('ElementChiffre', () => {
  it.each([
    [{ reference: 'M24-0655', libelle: 'Support latéral' }, 'M24-0655'],
    [{}, 'OF-2026-000001'],
  ])('should designate the element by its company reference or its internal name %j', (designation, expected) => {
    const element = new ElementChiffre('OF-2026-000001', new CategorieDElementChiffre('OF'), designation);

    expect(element.numero()).toBe(expected);
  });
  it('should carry the name and the category the report resolved', () => {
    const element = new ElementChiffre('OF-2026-000001', new CategorieDElementChiffre('OF'));

    expect([element.nom, element.categorie.value]).toEqual(['OF-2026-000001', 'OF']);
  });

  it.each(['', '   '])('should refuse the empty name %p, which designates nothing', nom => {
    expect(() => new ElementChiffre(nom, new CategorieDElementChiffre('MOULE'))).toThrow('Le nom de l’élément reçu du serveur est vide.');
  });
});
