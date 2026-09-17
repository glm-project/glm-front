import { InstantDeReleve } from './InstantDeReleve';

describe('InstantDeReleve', () => {
  it('should read an instant written in UTC', () => {
    const instant = new InstantDeReleve('2026-09-14T06:02:00Z');

    expect(instant.value.toISOString()).toBe('2026-09-14T06:02:00.000Z');
  });

  it('should read an instant written with its offset', () => {
    const instant = new InstantDeReleve('2026-09-14T08:02:00+02:00');

    expect(instant.value.toISOString()).toBe('2026-09-14T06:02:00.000Z');
  });

  it('should read an instant carrying fractional seconds', () => {
    const instant = new InstantDeReleve('2026-09-14T06:02:00.500Z');

    expect(instant.value.toISOString()).toBe('2026-09-14T06:02:00.500Z');
  });

  it.each(['2026-09-14T08:02:00', '2026-09-14', '2026-02-30T08:02:00Z', 'invalide', ''])(
    'should refuse %s, which is not an absolute instant',
    value => {
      expect(() => new InstantDeReleve(value)).toThrow('L’instant reçu du serveur n’est pas un instant absolu.');
    },
  );
});
