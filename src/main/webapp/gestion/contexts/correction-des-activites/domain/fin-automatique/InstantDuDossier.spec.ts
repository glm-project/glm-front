import { InstantDuDossier } from './InstantDuDossier';

describe('Instant of a dossier of an automatic end', () => {
  it.each(['2026-09-14T08:00:00Z', '2026-09-14T08:00:00.123456789+02:00'])('should be valid when it is the ISO instant %s', texte => {
    expect(new InstantDuDossier(texte).isValid()).toBe(true);
  });

  it.each([
    { cas: 'empty', texte: '' },
    { cas: 'followed by other text', texte: '2026-09-14T08:00:00Z demain' },
    { cas: 'spelling more than nine digits of fraction', texte: '2026-09-14T08:00:00.1234567891Z' },
    { cas: 'at the hour 24', texte: '2026-09-14T24:00:00Z' },
    { cas: 'on a day the calendar does not know', texte: '2026-02-30T08:00:00Z' },
  ])('should not be valid when it is $cas', ({ texte }) => {
    expect(new InstantDuDossier(texte).isValid()).toBe(false);
  });

  it('should compare by the nanosecond when two instants share the same millisecond', () => {
    const premier = new InstantDuDossier('2026-09-14T08:00:00.123456788Z');
    const second = new InstantDuDossier('2026-09-14T08:00:00.123456789Z');

    expect(premier.compareTo(second)).toBeLessThan(0);
  });

  it('should compare two spellings of the same instant, whatever the offset, as the same instant', () => {
    const nepal = new InstantDuDossier('2026-09-14T08:00:00+05:45');
    const utc = new InstantDuDossier('2026-09-14T02:15:00Z');

    expect(nepal.compareTo(utc)).toBe(0);
  });

  it('should reach the whole minutes around an instant', () => {
    const instant = new InstantDuDossier('2026-09-14T08:00:30Z');

    expect([instant.firstWholeMinute(), instant.lastWholeMinute()]).toEqual([
      Date.parse('2026-09-14T08:01:00Z'),
      Date.parse('2026-09-14T08:00:00Z'),
    ]);
  });

  it.each([
    { cas: 'in the middle of a minute', instant: '2026-09-14T08:00:30Z', attendu: '2026-09-14T08:01:00.000Z' },
    { cas: 'on a whole minute', instant: '2026-09-14T08:00:00Z', attendu: '2026-09-14T08:01:00.000Z' },
  ])('should reach the first whole minute strictly after an instant $cas', ({ instant, attendu }) => {
    expect(new Date(new InstantDuDossier(instant).firstWholeMinuteAfter()).toISOString()).toBe(attendu);
  });
});
