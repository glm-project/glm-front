import { CategorieDElementEngage } from './CategorieDElementEngage';

describe('CategorieDElementEngage', () => {
  it('should keep the category code copied at engagement', () => {
    const categorie = new CategorieDElementEngage('MOULE');

    expect(categorie.value).toBe('MOULE');
  });

  it('should remove surrounding whitespace from the copied category', () => {
    const categorie = new CategorieDElementEngage('  OF  ');

    expect(categorie.value).toBe('OF');
  });

  it.each(['', '   '])('should refuse a missing copied category: %s', value => {
    expect(() => new CategorieDElementEngage(value)).toThrow('La catégorie copiée à l’engagement ne peut pas être vide.');
  });
});
