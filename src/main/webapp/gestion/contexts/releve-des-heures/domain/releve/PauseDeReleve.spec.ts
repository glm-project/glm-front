import { InstantDeReleve } from './InstantDeReleve';
import { PauseDeReleve } from './PauseDeReleve';

const instantFixture = (heure: string): InstantDeReleve => new InstantDeReleve(`2026-09-14T${heure}:00Z`);

describe('PauseDeReleve', () => {
  it('should refuse a break with neither start nor end', () => {
    expect(() => new PauseDeReleve(undefined, undefined)).toThrow('Une pause a au moins un début ou une fin.');
  });

  it.each([
    ['resumed that day', new PauseDeReleve(instantFixture('12:00'), instantFixture('12:45')), false],
    ['coming from the day before', new PauseDeReleve(undefined, instantFixture('00:22')), false],
    ['not resumed that day', new PauseDeReleve(instantFixture('23:40'), undefined), true],
  ])('should tell whether a break %s is without resumption', (_cas, pause, sansReprise) => {
    expect(pause.estSansReprise()).toBe(sansReprise);
  });
});
