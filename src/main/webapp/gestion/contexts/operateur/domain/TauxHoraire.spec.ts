import { TauxHoraire } from './TauxHoraire';

describe('TauxHoraire', () => {
  it('should accept a strictly positive hourly rate', () => {
    expect(new TauxHoraire(22).value).toBe(22);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('should refuse a rate that is not strictly positive: %s', value => {
    expect(() => new TauxHoraire(value)).toThrow('Le taux horaire doit être un nombre strictement positif.');
  });
});
