import { LibelleDElement } from './LibelleDElement';

describe('LibelleDElement', () => {
  it.each(['Moule de capot', 'a'.repeat(1000)])('should accept a label the server can store: %s', value => {
    const libelle = new LibelleDElement(value);

    expect(libelle.value).toBe(value);
  });

  it('should remove surrounding whitespace from a label', () => {
    const libelle = new LibelleDElement('  Moule de capot  ');

    expect(libelle.value).toBe('Moule de capot');
  });

  it.each(['', '   ', 'a'.repeat(1001)])('should refuse an empty or unstorable label: %s', value => {
    expect(() => new LibelleDElement(value)).toThrow('Le libellé est limité à 1000 caractères.');
  });

  it.each(['Moule de capot', 'a'.repeat(100)])('should report no entry error for a one-line label: %s', value => {
    expect(LibelleDElement.erreur(value)).toBeUndefined();
  });

  it('should report an entry error for a label beyond one line', () => {
    expect(LibelleDElement.erreur('a'.repeat(101))).toBe('Le libellé tient sur une ligne : 100 caractères au plus.');
  });
});
