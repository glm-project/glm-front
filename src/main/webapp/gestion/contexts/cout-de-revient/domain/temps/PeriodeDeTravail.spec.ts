import { InstantDeTravail } from './InstantDeTravail';
import { PeriodeDeTravail } from './PeriodeDeTravail';

describe('PeriodeDeTravail', () => {
  it('should carry both ends of the interval', () => {
    const periode = new PeriodeDeTravail(new InstantDeTravail('2026-05-11T09:00:00Z'), new InstantDeTravail('2026-05-11T11:00:00Z'));

    expect([periode.debut.value.toISOString(), periode.fin.value.toISOString()]).toEqual([
      '2026-05-11T09:00:00.000Z',
      '2026-05-11T11:00:00.000Z',
    ]);
  });
});
