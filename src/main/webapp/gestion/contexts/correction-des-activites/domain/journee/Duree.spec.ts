import { Duree } from './Duree';

describe('Duree', () => {
  it.each([
    { recue: 'PT2H', millisecondes: 7_200_000 },
    { recue: 'PT3H30M', millisecondes: 12_600_000 },
    { recue: 'PT45M', millisecondes: 2_700_000 },
    { recue: 'PT0S', millisecondes: 0 },
    { recue: 'PT57H30M', millisecondes: 207_000_000 },
    { recue: 'PT1M59.5S', millisecondes: 119_500 },
    { recue: 'PT30S', millisecondes: 30_000 },
  ])('should read the duration $recue as $millisecondes milliseconds', ({ recue, millisecondes }) => {
    expect(new Duree(recue).millisecondes).toBe(millisecondes);
  });

  it.each(['PT', '2h', 'P1D', 'PT-1H', ''])('should refuse the duration "%s"', recue => {
    expect(() => new Duree(recue)).toThrow(`La durée « ${recue} » reçue du serveur n’est pas une durée.`);
  });

  it('should add durations exactly, seconds included', () => {
    expect(new Duree('PT1H59M30S').plus(new Duree('PT3H30M45S'))).toEqual(new Duree('PT5H30M15S'));
  });

  it('should subtract durations exactly, seconds included', () => {
    expect(new Duree('PT5H30M15S').moins(new Duree('PT3H30M45S'))).toEqual(new Duree('PT1H59M30S'));
  });

  it('should refuse a subtraction that leaves less than nothing', () => {
    expect(() => new Duree('PT1H').moins(new Duree('PT1H1S'))).toThrow('Une durée ne peut pas être retranchée d’une durée plus courte.');
  });
});
