import { Instant } from './Instant';

describe('Instant', () => {
  it.each(['invalid', '', '2026-09-13', '2026-09-13T08:00:00', '2026-02-30T08:00:00Z'])(
    'should reject a non-absolute or invalid instant %s',
    value => {
      expect(() => new Instant(value)).toThrow('Invalid absolute supervision instant');
    },
  );

  it('should identify equivalent instants regardless of their time zone', () => {
    const utc = new Instant('2026-09-13T08:00:00Z');
    const paris = new Instant('2026-09-13T10:00:00+02:00');

    expect(utc.equals(paris)).toBe(true);
    expect(paris.value).toBe('2026-09-13T08:00:00.000Z');
  });

  it('should distinguish different instants', () => {
    const debut = new Instant('2026-09-13T08:00:00Z');
    const suivant = new Instant('2026-09-13T08:00:00.001Z');

    expect(debut.equals(suivant)).toBe(false);
  });
});
