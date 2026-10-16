import { JourACorriger } from '../../domain/journee/JourACorriger';
import { calendrierDuNavigateur } from './CalendrierDuNavigateur';

describe('Calendar of the browser', () => {
  it('should turn an hour of a calendar day into the instant of the local clock at that hour', () => {
    const instant = calendrierDuNavigateur.instantA(new JourACorriger('2026-10-05'), 8, 30);

    expect(instant.value).toEqual(new Date(2026, 9, 5, 8, 30));
  });

  it('should turn an hour of the next day of the month into the instant of the local clock at that hour', () => {
    const instant = calendrierDuNavigateur.instantA(new JourACorriger('2026-12-31'), 23, 59);

    expect(instant.value).toEqual(new Date(2026, 11, 31, 23, 59));
  });
});
