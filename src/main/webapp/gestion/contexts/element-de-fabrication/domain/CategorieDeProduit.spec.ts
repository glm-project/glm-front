import { CategorieDeProduit } from './CategorieDeProduit';

describe('CategorieDeProduit', () => {
  it('should keep the code the company declared', () => {
    const categorie = new CategorieDeProduit('MOULE');

    expect(categorie.value).toBe('MOULE');
  });

  it('should remove surrounding whitespace from the code', () => {
    const categorie = new CategorieDeProduit('  OF  ');

    expect(categorie.value).toBe('OF');
  });

  it.each(['', '   '])('should refuse the empty code %p, which classifies nothing', value => {
    expect(() => new CategorieDeProduit(value)).toThrow('La catégorie de produit ne peut pas être vide.');
  });

  it.each([
    ['MOULE', true],
    ['OF', false],
  ])('should tell whether %s is the same category as MOULE', (code, attendu) => {
    expect(new CategorieDeProduit('MOULE').estLaMeme(new CategorieDeProduit(code))).toBe(attendu);
  });
});
