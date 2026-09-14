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
});
