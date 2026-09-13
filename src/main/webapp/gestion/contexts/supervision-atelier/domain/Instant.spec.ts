import { Instant } from './Instant';
import { InstantInvalide } from './InstantInvalide';

describe('Instant', () => {
  it.each(['invalid', '', '2026-09-13', '2026-09-13T08:00:00', '2026-02-30T08:00:00Z'])(
    'should identify an invalid instant and retain its rejected value %s',
    value => {
      const refus = refusFixture(value);

      expect(refus).toBeInstanceOf(InstantInvalide);
      expect(refus).toMatchObject({ valeurRejetee: value });
    },
  );

  it('should expose an absolute instant in UTC regardless of its input time zone', () => {
    const paris = new Instant('2026-09-13T10:00:00+02:00');

    expect(paris.value).toBe('2026-09-13T08:00:00.000Z');
  });
});

function refusFixture(value: string): unknown {
  try {
    new Instant(value);
  } catch (error) {
    return error;
  }
  throw new Error('Expected the instant to be rejected');
}
