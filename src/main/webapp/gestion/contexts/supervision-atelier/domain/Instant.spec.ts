import { Instant } from './Instant';

describe('Instant', () => {
  it.each(['invalid', '', '2026-09-13', '2026-09-13T08:00:00', '2026-02-30T08:00:00Z'])(
    'should reject a non-absolute or invalid instant %s',
    value => {
      expect(() => new Instant(value)).toThrow('Invalid absolute supervision instant');
    },
  );

  it('should expose an absolute instant in UTC regardless of its input time zone', () => {
    const paris = new Instant('2026-09-13T10:00:00+02:00');

    expect(paris.value).toBe('2026-09-13T08:00:00.000Z');
  });
});
