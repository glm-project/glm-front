import { NatureDeTravail } from './NatureDeTravail';

describe('NatureDeTravail', () => {
  it.each(['tournage', 'a'.repeat(50)])('should accept a nature within its bounds: %s', value => {
    const nature = new NatureDeTravail(value);

    expect(nature.value).toBe(value);
  });

  it('should remove surrounding whitespace from a nature', () => {
    const nature = new NatureDeTravail('  tournage  ');

    expect(nature.value).toBe('tournage');
  });

  it.each(['', '   ', 'a'.repeat(51)])('should refuse an empty or oversized nature: %s', value => {
    expect(() => new NatureDeTravail(value)).toThrow('La nature est obligatoire et limitée à 50 caractères.');
  });

  it('should compare alphabetically using French collation', () => {
    const tournage = new NatureDeTravail('tournage');
    const usinage = new NatureDeTravail('usinage');

    expect(tournage.compare(usinage)).toBeLessThan(0);
    expect(usinage.compare(tournage)).toBeGreaterThan(0);
    expect(tournage.compare(new NatureDeTravail('tournage'))).toBe(0);
  });

  it('should match search terms case-insensitively and ignore whitespace', () => {
    const nature = new NatureDeTravail('Tournage sur bois');

    expect(nature.correspondA('tour')).toBe(true);
    expect(nature.correspondA('  BOIS  ')).toBe(true);
    expect(nature.correspondA('soudage')).toBe(false);
  });
});
