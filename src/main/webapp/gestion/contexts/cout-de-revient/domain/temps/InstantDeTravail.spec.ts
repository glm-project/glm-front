import { InstantDeTravail } from './InstantDeTravail';

describe('InstantDeTravail', () => {
  it('should read an instant written in UTC', () => {
    expect(new InstantDeTravail('2026-05-11T09:00:00Z').value.toISOString()).toBe('2026-05-11T09:00:00.000Z');
  });

  it('should read an instant written with its offset', () => {
    expect(new InstantDeTravail('2026-05-11T11:00:00+02:00').value.toISOString()).toBe('2026-05-11T09:00:00.000Z');
  });

  it('should read an instant carrying milliseconds', () => {
    expect(new InstantDeTravail('2026-05-11T09:00:00.250Z').value.toISOString()).toBe('2026-05-11T09:00:00.250Z');
  });

  it.each(['2026-05-11T09:00:00', '2026-05-11 09:00:00Z', '2026-05-11', '2026-02-30T09:00:00Z', '2026-13-01T09:00:00Z', ''])(
    'should refuse %p, which is not an absolute instant',
    value => {
      expect(() => new InstantDeTravail(value)).toThrow('L’instant reçu du serveur n’est pas un instant absolu.');
    },
  );
});
