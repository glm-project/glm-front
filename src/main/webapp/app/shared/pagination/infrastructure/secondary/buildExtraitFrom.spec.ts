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

  const unePageFixture = (noms: string[], nombreTotal: number): PageRest<string> => ({
    content: noms,
    currentPage: 0,
    pageSize: noms.length,
    totalElementsCount: nombreTotal,
  });

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
});
