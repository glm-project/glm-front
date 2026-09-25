import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailInvalide } from './NatureDeTravailInvalide';

describe('NatureDeTravail', () => {
  it.each(['', '  '])('should refuse a blank trade %j and retain it', value => {
    const refus = refusFixture(value);

    expect(refus).toBeInstanceOf(NatureDeTravailInvalide);
    expect(refus).toMatchObject({ valeurRejetee: value });
  });

  it('should keep the trade as it was typed, equal to any other built from the same text', () => {
    const nature = new NatureDeTravail('découpe à fil');

    expect(nature).toEqual(new NatureDeTravail('découpe à fil'));
    expect(nature.value).toBe('découpe à fil');
  });
});

function refusFixture(value: string): unknown {
  try {
    new NatureDeTravail(value);
  } catch (error) {
    return error;
  }
  throw new Error('Expected the trade to be refused');
}
