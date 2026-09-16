import { ReferenceDElement } from './ReferenceDElement';

describe('ReferenceDElement', () => {
  it.each(['1015', 'a'.repeat(100)])('should accept a company number within its bounds: %s', value => {
    const reference = new ReferenceDElement(value);

    expect(reference.value).toBe(value);
  });

  it('should remove surrounding whitespace from a company number', () => {
    const reference = new ReferenceDElement('  1015  ');

    expect(reference.value).toBe('1015');
  });

  it.each(['', '   ', 'a'.repeat(101)])('should refuse an empty or oversized company number: %s', value => {
    expect(() => new ReferenceDElement(value)).toThrow('La référence est limitée à 100 caractères.');
  });

  it.each(['1015', 'a'.repeat(100)])('should report no entry error for an acceptable company number: %s', value => {
    expect(ReferenceDElement.erreur(value)).toBeUndefined();
  });

  it('should report an entry error for an oversized company number', () => {
    expect(ReferenceDElement.erreur('a'.repeat(101))).toBe('La référence est limitée à 100 caractères.');
  });
});
