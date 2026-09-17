import { DureeTravaillee } from './DureeTravaillee';

describe('DureeTravaillee', () => {
  it.each([
    ['PT38H', 38, 0],
    ['PT8H', 8, 0],
    ['PT7H30M', 7, 30],
    ['PT90M', 1, 30],
    ['PT0S', 0, 0],
    ['PT45S', 0, 0],
    ['PT1H30M45S', 1, 30],
    ['PT7H30M0.500S', 7, 30],
  ])('should read %s as %i h %i', (value, heures, minutesRestantes) => {
    const duree = new DureeTravaillee(value);

    expect(duree).toMatchObject({ heures, minutesRestantes });
  });

  it('should keep the whole duration in minutes', () => {
    const duree = new DureeTravaillee('PT38H15M');

    expect(duree.minutes).toBe(2295);
  });

  it.each(['P1D', 'P1W', 'PT', 'PT-1H', 'PT1H2D', '38h', '1:30', ''])('should refuse %s, which is not a working duration', value => {
    expect(() => new DureeTravaillee(value)).toThrow('n’est pas une durée de travail');
  });
});
