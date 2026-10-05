import { JourCalendaire } from './JourCalendaire';

describe('JourCalendaire', () => {
  it.each(['2026-02-30', '2026-10-8', 'demain'])('should refuse %s as a calendar day', value => {
    const construction = (): JourCalendaire => new JourCalendaire(value);

    expect(construction).toThrow(`La date « ${value} » n’est pas un jour du calendrier.`);
  });

  it('should move across a month boundary', () => {
    const lendemain = new JourCalendaire('2026-09-30').plus(1);

    expect(lendemain.value).toBe('2026-10-01');
  });

  it.each([
    ['2026-10-05', 1],
    ['2026-10-11', 7],
  ])('should give %s its ISO weekday %i', (value, jourDeLaSemaine) => {
    const jour = new JourCalendaire(value);

    expect(jour.jourDeLaSemaine()).toBe(jourDeLaSemaine);
  });

  it.each([
    ['2026-10-08', true],
    ['2026-10-09', false],
  ])('should compare days by date', (autre, attendu) => {
    const memeJour = new JourCalendaire('2026-10-08').estLeMeme(new JourCalendaire(autre));

    expect(memeJour).toBe(attendu);
  });
});
