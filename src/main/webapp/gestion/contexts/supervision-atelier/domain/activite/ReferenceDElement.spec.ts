import { ReferenceDElement } from './ReferenceDElement';
import { ReferenceDElementInvalide } from './ReferenceDElementInvalide';

describe('ReferenceDElement', () => {
  it.each(['', '   '])('should refuse a blank reference %j and retain it', value => {
    const refus = refusFixture(value);

    expect(refus).toBeInstanceOf(ReferenceDElementInvalide);
    expect(refus).toMatchObject({ valeurRejetee: value });
  });

  it('should keep the reference the company gave, equal to any other built from the same text', () => {
    const reference = new ReferenceDElement('1015');

    expect(reference).toEqual(new ReferenceDElement('1015'));
    expect(reference.value).toBe('1015');
  });
});

function refusFixture(value: string): unknown {
  try {
    new ReferenceDElement(value);
  } catch (error) {
    return error;
  }
  throw new Error('Expected the reference to be refused');
}
