import { Matricule } from './Matricule';

describe('Matricule', () => {
  it.each(['049', 'a'.repeat(50)])('should accept a payroll number within its bounds: %s', value => {
    const matricule = new Matricule(value);

    expect(matricule.value).toBe(value);
  });

  it('should trim the surrounding whitespace of a payroll number', () => {
    const matricule = new Matricule('  049  ');

    expect(matricule.value).toBe('049');
  });

  it.each(['', '   ', 'a'.repeat(51)])('should refuse an empty or oversized payroll number: %s', value => {
    expect(() => new Matricule(value)).toThrow('Le matricule est limité à 50 caractères.');
  });
});
