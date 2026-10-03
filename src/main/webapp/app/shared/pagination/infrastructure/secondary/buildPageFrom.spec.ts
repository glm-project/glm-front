import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom, RestPage } from './buildPageFrom';

const PLUS_QUE_LA_PAGE_N_EN_PORTE = 137;

const enMajuscules = (nom: string): string => nom.toUpperCase();

describe('buildPageFrom', () => {
  it.each([
    { page: 1, taille: 2 },
    { page: 0, taille: 3 },
  ])('should reject a response whose page or size differs from the request %j', requested => {
    const response = unePageFixture(['Dupont', 'Martin'], 2);

    expect(() => buildPageFrom(response, enMajuscules, requested)).toThrow('La page reçue ne correspond pas à la page demandée.');
  });

  it('should translate a response that matches its requested page', () => {
    const response = unePageFixture(['Dupont', 'Martin'], 2);

    const page = buildPageFrom(response, enMajuscules, { page: 0, taille: 2 });

    thenItCarries(page, ['DUPONT', 'MARTIN']);
  });
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
