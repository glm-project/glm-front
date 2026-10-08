import { CategorieDElement } from './CategorieDElement';

describe('CategorieDElement', () => {
  it('should keep the category code of the worked element', () => {
    const categorie = new CategorieDElement('MOULE');

    expect(categorie.value).toBe('MOULE');
  });

  it('should remove surrounding whitespace from the received category', () => {
    const categorie = new CategorieDElement('  OF  ');

    expect(categorie.value).toBe('OF');
  });

  it.each(['', '   '])('should refuse the empty category %p, which classifies nothing', value => {
    expect(() => new CategorieDElement(value)).toThrow('La catégorie de l’élément travaillé ne peut pas être vide.');
  });
});
