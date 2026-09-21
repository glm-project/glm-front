import { DureePassee } from './DureePassee';

describe('DureePassee', () => {
  it.each([
    ['PT2H', 120, 2, 0],
    ['PT30M', 30, 0, 30],
    ['PT2H30M', 150, 2, 30],
    ['PT90M', 90, 1, 30],
    ['PT0S', 0, 0, 0],
  ])('should read %s as %i minutes', (value, minutes, heures, minutesRestantes) => {
    const duree = new DureePassee(value);

    expect([duree.minutes, duree.heures, duree.minutesRestantes]).toEqual([minutes, heures, minutesRestantes]);
  });

  it('should drop the seconds a report never displays', () => {
    expect(new DureePassee('PT1H30M45S').minutes).toBe(90);
  });

  it('should count a full minute of seconds, so that PT90S is not mistaken for nothing', () => {
    expect(new DureePassee('PT90S').minutes).toBe(1);
  });

  it.each(['P1D', 'P1W', 'PT', 'PT-1H', '2h', '1:30', ''])('should refuse %p, which the back never writes', value => {
    expect(() => new DureePassee(value)).toThrow(`La durée « ${value} » reçue du serveur n’est pas un temps passé.`);
  });

  it('should recognise a duration carrying no time at all', () => {
    expect(new DureePassee('PT0S').estNulle()).toBe(true);
  });

  it('should not call a duration of one minute empty', () => {
    expect(new DureePassee('PT1M').estNulle()).toBe(false);
  });
});
