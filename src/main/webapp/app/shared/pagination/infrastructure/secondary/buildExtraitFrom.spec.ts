import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { buildExtraitFrom, PageRest } from './buildExtraitFrom';

const PLUS_QUE_LA_PAGE_N_EN_PORTE = 137;

const enMajuscules = (nom: string): string => nom.toUpperCase();

describe('buildExtraitFrom', () => {
  it('should hand over every element of the page, turned into the model', () => {
    const extrait = buildExtraitFrom(unePageFixture(['Dupont', 'Martin'], 2), enMajuscules);

    thenItCarries(extrait, ['DUPONT', 'MARTIN']);
    thenItSaysItIsComplete(extrait);
  });

  it('should say the extract is partial when the server counted more than the page holds', () => {
    const extrait = buildExtraitFrom(unePageFixture(['Dupont'], PLUS_QUE_LA_PAGE_N_EN_PORTE), enMajuscules);

    thenItSaysItIsPartialOf(extrait, PLUS_QUE_LA_PAGE_N_EN_PORTE);
  });

  it('should read an empty extract from a page the server sent without content', () => {
    const extrait = buildExtraitFrom({ totalElementsCount: 0 }, enMajuscules);

    thenItCarries(extrait, []);
    thenItSaysItIsComplete(extrait);
  });

  it('should refuse a page the server sent without the count the extract needs', () => {
    thenItRefuses(() => buildExtraitFrom({ content: ['Dupont'] }, enMajuscules), 'totalElementsCount');
  });

  const unePageFixture = (noms: string[], nombreTotal: number): PageRest<string> => ({ content: noms, totalElementsCount: nombreTotal });

  const thenItCarries = (extrait: Extrait<string>, elements: string[]): void => {
    expect(extrait.elements).toEqual(elements);
  };

  const thenItSaysItIsComplete = (extrait: Extrait<string>): void => {
    expect(extrait.isComplete()).toBe(true);
  };

  const thenItSaysItIsPartialOf = (extrait: Extrait<string>, nombreTotal: number): void => {
    expect(extrait.isComplete()).toBe(false);
    expect(extrait.nombreTotal).toBe(nombreTotal);
  };

  const thenItRefuses = (lecture: () => unknown, champ: string): void => {
    expect(lecture).toThrow(champ);
  };
});
