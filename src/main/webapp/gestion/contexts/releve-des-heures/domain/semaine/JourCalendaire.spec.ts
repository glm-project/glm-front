import { JourCalendaire } from './JourCalendaire';

describe('JourCalendaire', () => {
  it('should keep the day as the server wrote it', () => {
    const jour = new JourCalendaire('2026-09-14');

    expect(jour.value).toBe('2026-09-14');
  });

  it.each(['2026-02-30', '2026-13-01', '2026-09-31', '2026-9-1', '14/09/2026', '2026-09-14T00:00:00Z', ''])(
    'should refuse %s, which the calendar does not carry',
    value => {
      expect(() => new JourCalendaire(value)).toThrow('La date reçue du serveur n’est pas un jour du calendrier.');
    },
  );

  it.each([
    ['2026-09-14', 1],
    ['2026-09-15', 2],
    ['2026-09-16', 3],
    ['2026-09-17', 4],
    ['2026-09-18', 5],
    ['2026-09-19', 6],
    ['2026-09-20', 7],
  ])('should number %s as ISO weekday %i', (value, attendu) => {
    const jour = new JourCalendaire(value);

    expect(jour.jourDeLaSemaine()).toBe(attendu);
  });

  it('should move to the next day across a month boundary', () => {
    const jour = new JourCalendaire('2026-09-30');

    expect(jour.plus(1).value).toBe('2026-10-01');
  });

  it('should move to the previous day across a year boundary', () => {
    const jour = new JourCalendaire('2026-01-01');

    expect(jour.plus(-1).value).toBe('2025-12-31');
  });

  it('should move across a leap day', () => {
    const jour = new JourCalendaire('2028-02-28');

    expect(jour.plus(1).value).toBe('2028-02-29');
  });

  it('should rebuild a day from its distance to the epoch', () => {
    const jour = new JourCalendaire('2026-09-14');

    expect(JourCalendaire.depuisEpoque(jour.jourEpoque).value).toBe('2026-09-14');
  });
});
