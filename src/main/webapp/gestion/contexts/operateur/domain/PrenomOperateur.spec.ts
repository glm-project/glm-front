import { PrenomOperateur } from './PrenomOperateur';

describe('PrenomOperateur', () => {
  it.each(['Jean', 'a'.repeat(100)])('should accept a first name within its bounds: %s', value => {
    const prenom = new PrenomOperateur(value);

    expect(prenom.value).toBe(value);
  });

  it('should trim the surrounding whitespace of a first name', () => {
    const prenom = new PrenomOperateur('  Jean  ');

    expect(prenom.value).toBe('Jean');
  });

  it.each(['', '   ', 'a'.repeat(101)])('should refuse an empty or oversized first name: %s', value => {
    expect(() => new PrenomOperateur(value)).toThrow('Le prénom est obligatoire et limité à 100 caractères.');
  });
});
