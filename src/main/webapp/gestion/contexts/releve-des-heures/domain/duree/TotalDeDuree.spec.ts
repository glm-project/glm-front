import { DureeTravaillee } from './DureeTravaillee';
import { TotalDeDuree } from './TotalDeDuree';

describe('TotalDeDuree', () => {
  it.each([
    ['PT0S', 0, true],
    ['PT1H', 60, false],
  ] as const)('should expose a complete total %s including zero', (valeur, minutes, nul) => {
    const total = TotalDeDuree.complet(new DureeTravaillee(valeur));

    expect(total.snapshot()).toMatchObject({ complete: true, valeur: { minutes } });
    expect(total.estNul()).toBe(nul);
  });

  it('should expose an incomplete total without a numerical value', () => {
    const total = TotalDeDuree.incomplet();

    expect(total.snapshot()).toEqual({ complete: false });
    expect(total.estNul()).toBe(false);
  });
});
