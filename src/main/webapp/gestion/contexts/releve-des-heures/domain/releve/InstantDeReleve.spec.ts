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

  it.each(['2026-09-14T08:02:00', '2026-09-14', '2026-02-30T08:02:00Z', '2026-13-01T08:02:00Z', 'invalide', ''])(
    'should refuse %s, which is not an absolute instant',
    value => {
      expect(() => new InstantDeReleve(value)).toThrow('L’instant reçu du serveur n’est pas un instant absolu.');
    },
  );

  describe('calendar day', () => {
    const instantLocal = (jour: number, heure: number, minute: number): InstantDeReleve =>
      new InstantDeReleve(new Date(2026, 8, jour, heure, minute).toISOString());

    it('should fall on the same day as an earlier instant of that day', () => {
      expect(instantLocal(14, 23, 59).estUnAutreJourQue(instantLocal(14, 0, 0))).toBe(false);
    });

    it('should fall on another day than an instant of the day before, by a minute', () => {
      expect(instantLocal(15, 0, 0).estUnAutreJourQue(instantLocal(14, 23, 59))).toBe(true);
    });

    it('should fall on another day than an instant of the day after', () => {
      expect(instantLocal(14, 8, 0).estUnAutreJourQue(instantLocal(15, 8, 0))).toBe(true);
    });
  });
});
