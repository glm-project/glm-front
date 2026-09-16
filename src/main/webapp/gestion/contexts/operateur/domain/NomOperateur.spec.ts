import { NomOperateur } from './NomOperateur';

describe('NomOperateur', () => {
  it.each(['Dupont', 'a'.repeat(100)])('should accept a family name within its bounds: %s', value => {
    const nom = new NomOperateur(value);

    expect(nom.value).toBe(value);
  });

  it('should trim the surrounding whitespace of a family name', () => {
    const nom = new NomOperateur('  Dupont  ');

    expect(nom.value).toBe('Dupont');
  });

  it.each(['', '   ', 'a'.repeat(101)])('should refuse an empty or oversized family name: %s', value => {
    expect(() => new NomOperateur(value)).toThrow('Le nom est obligatoire et limité à 100 caractères.');
  });
});
