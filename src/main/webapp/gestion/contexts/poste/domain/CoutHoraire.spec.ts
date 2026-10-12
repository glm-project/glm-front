import { CoutHoraire } from './CoutHoraire';

describe('CoutHoraire', () => {
  it.each([0, 0.01, 45.5, 100])('should retain a positive or zero hourly cost: %s', value => {
    const cout = new CoutHoraire(value);

    expect(cout.value).toBe(value);
  });

  it.each([-0.01, -1, NaN, Infinity, -Infinity])('should refuse a negative or nonfinite hourly cost: %s', value => {
    expect(() => new CoutHoraire(value)).toThrow('Le coût horaire doit être un nombre positif ou nul.');
  });
});
