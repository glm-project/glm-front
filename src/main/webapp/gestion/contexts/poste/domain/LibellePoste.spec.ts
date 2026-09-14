import { LibellePoste } from './LibellePoste';

describe('LibellePoste', () => {
  it.each(['Tour 1', 'a'.repeat(100)])('should accept a workstation label within its bounds: %s', value => {
    const libelle = new LibellePoste(value);

    expect(libelle.value).toBe(value);
  });

  it('should remove surrounding whitespace from a label', () => {
    const libelle = new LibellePoste('  Tour 1  ');

    expect(libelle.value).toBe('Tour 1');
  });

  it.each(['', '   ', 'a'.repeat(101)])('should refuse an empty or oversized label: %s', value => {
    expect(() => new LibellePoste(value)).toThrow('Le libellé est obligatoire et limité à 100 caractères.');
  });

  it('should be equal only to a label carrying the same value', () => {
    const libelle = new LibellePoste('Tour 1');

    expect(libelle.equals(new LibellePoste('Tour 1'))).toBe(true);
    expect(libelle.equals(new LibellePoste('Tour 2'))).toBe(false);
    expect(libelle.equals(undefined)).toBe(false);
  });
});
