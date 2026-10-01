import { Identifiant } from './Identifiant';

describe('Identifiant', () => {
  it.each(['049', 'a'.repeat(50)])('should accept a payroll number within its bounds: %s', value => {
    const identifiant = new Identifiant(value);

    expect(identifiant.value).toBe(value);
  });

  it('should trim the surrounding whitespace of a payroll number', () => {
    const identifiant = new Identifiant('  049  ');

    expect(identifiant.value).toBe('049');
  });

  it.each(['', '   ', 'a'.repeat(51)])('should refuse an empty or oversized payroll number: %s', value => {
    expect(() => new Identifiant(value)).toThrow("L'identifiant est limité à 50 caractères.");
  });
});
