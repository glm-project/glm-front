import { Page } from './Page';

const UNE_POIGNEE = ['Dupont', 'Martin'];
const PLUS_QUE_L_EXTRAIT_N_EN_PORTE = 137;

describe('Page', () => {
  it('should be complete when it carries every element the server counted', () => {
    const extrait = unExtraitFixture(UNE_POIGNEE, UNE_POIGNEE.length);

    thenItSaysItIsComplete(extrait);
  });

  it('should say it is partial when the server counted more than it carries', () => {
    const extrait = unExtraitFixture(UNE_POIGNEE, PLUS_QUE_L_EXTRAIT_N_EN_PORTE);

    thenItSaysItIsPartialOf(extrait, PLUS_QUE_L_EXTRAIT_N_EN_PORTE);
  });

  const unExtraitFixture = (elements: string[], totalCount: number): Page<string> => new Page(elements, totalCount);

  const thenItSaysItIsComplete = (extrait: Page<string>): void => {
    expect(extrait.isComplete()).toBe(true);
  };

  const thenItSaysItIsPartialOf = (extrait: Page<string>, totalCount: number): void => {
    expect(extrait.isComplete()).toBe(false);
    expect(extrait.totalCount).toBe(totalCount);
  };
});
