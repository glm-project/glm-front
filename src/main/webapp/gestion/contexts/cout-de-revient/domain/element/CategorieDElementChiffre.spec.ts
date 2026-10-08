import { CategorieDElementChiffre } from './CategorieDElementChiffre';

describe('CategorieDElementChiffre', () => {
  it('should keep the category code the report resolved', () => {
    const categorie = new CategorieDElementChiffre('MOULE');

    expect(categorie.value).toBe('MOULE');
  });

  it('should remove surrounding whitespace from the received category', () => {
    const categorie = new CategorieDElementChiffre('  OF  ');

    expect(categorie.value).toBe('OF');
  });

  it.each(['', '   '])('should refuse the empty category %p, which classifies nothing', value => {
    expect(() => new CategorieDElementChiffre(value)).toThrow('La catégorie de l’élément reçue du serveur est vide.');
  });
});
