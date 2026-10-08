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

  it.each(['', '   ', 'Moule', 'PIÈCE', 'MOULE OF', 'ABCDEFGHIJK', 'OF2'])(
    'should refuse the code %p, outside 1 to 10 capital letters',
    value => {
      expect(() => new CategorieDeProduit(value)).toThrow('Le code tient en 1 à 10 lettres majuscules, sans accent ni espace.');
    },
  );

  it.each(['A', 'ABCDEFGHIJ'])('should accept the code %p, within 1 to 10 capital letters', value => {
    expect(CategorieDeProduit.erreur(value)).toBeUndefined();
  });

  it.each([
    ['MOULE', true],
    ['OF', false],
  ])('should tell whether %s is the same category as MOULE', (code, attendu) => {
    expect(new CategorieDeProduit('MOULE').estLaMeme(new CategorieDeProduit(code))).toBe(attendu);
  });
});
