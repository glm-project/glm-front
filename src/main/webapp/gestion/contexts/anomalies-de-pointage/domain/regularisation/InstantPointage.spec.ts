import { InstantPointage } from './InstantPointage';

describe('Instant of a pointage', () => {
  it.each(['2026-09-14T08:00:00Z', '2026-09-14T08:00:00.123456789+02:00'])('should be valid when it is the ISO instant %s', texte => {
    expect(new InstantPointage(texte).isValid()).toBe(true);
  });

  it.each([
    { cas: 'empty', texte: '' },
    { cas: 'followed by other text', texte: '2026-09-14T08:00:00Z demain' },
    { cas: 'at the hour 24', texte: '2026-09-14T24:00:00Z' },
    { cas: 'on a day the calendar does not know', texte: '2026-02-30T08:00:00Z' },
  ])('should not be valid when it is $cas', ({ texte }) => {
    expect(new InstantPointage(texte).isValid()).toBe(false);
  });

  it('should compare by the nanosecond when two instants share the same millisecond', () => {
    const premier = new InstantPointage('2026-09-14T08:00:00.123456788Z');
    const second = new InstantPointage('2026-09-14T08:00:00.123456789Z');

    expect(premier.compareTo(second)).toBeLessThan(0);
  });

  it('should reach the whole minutes around an instant', () => {
    const instant = new InstantPointage('2026-09-14T08:00:30Z');

    expect([instant.firstWholeMinute(), instant.lastWholeMinute()]).toEqual([
      Date.parse('2026-09-14T08:01:00Z'),
      Date.parse('2026-09-14T08:00:00Z'),
    ]);
  });
});
