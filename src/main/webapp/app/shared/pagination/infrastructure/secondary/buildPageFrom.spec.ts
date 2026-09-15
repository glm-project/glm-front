import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom, RestPage } from './buildPageFrom';

const PLUS_QUE_LA_PAGE_N_EN_PORTE = 137;

const enMajuscules = (nom: string): string => nom.toUpperCase();

describe('buildPageFrom', () => {
  it('should hand over every element of the page, turned into the model', () => {
    const extrait = buildPageFrom(unePageFixture(['Dupont', 'Martin'], 2), enMajuscules);

    thenItCarries(extrait, ['DUPONT', 'MARTIN']);
    thenTotalIs(extrait, 2);
  });

  it('should say the extract is partial when the server counted more than the page holds', () => {
    const extrait = buildPageFrom(unePageFixture(['Dupont'], PLUS_QUE_LA_PAGE_N_EN_PORTE), enMajuscules);

    thenItCarries(extrait, ['DUPONT']);
    thenTotalIs(extrait, PLUS_QUE_LA_PAGE_N_EN_PORTE);
  });

  const unePageFixture = (noms: string[], totalCount: number): RestPage<string> => ({
    content: noms,
    currentPage: 0,
    pageSize: noms.length,
    totalElementsCount: totalCount,
  });

  const thenItCarries = (extrait: Page<string>, elements: string[]): void => {
    expect(extrait.elements).toEqual(elements);
  };

  const thenTotalIs = (extrait: Page<string>, totalCount: number): void => {
    expect(extrait.totalCount).toBe(totalCount);
  };
});
