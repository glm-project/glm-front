import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { extraitDe, PageRest } from './extraitDe';

const PLUS_QUE_LA_PAGE_N_EN_PORTE = 137;

const enMajuscules = (nom: string): string => nom.toUpperCase();

describe('extraitDe', () => {
  it('should hand over every element of the page, turned into the model', () => {
    const extrait = extraitDe(unePageFixture(['Dupont', 'Martin'], 2), enMajuscules);

    thenItCarries(extrait, ['DUPONT', 'MARTIN']);
    thenItSaysItIsComplete(extrait);
  });

  it('should say the extract is partial when the server counted more than the page holds', () => {
    const extrait = extraitDe(unePageFixture(['Dupont'], PLUS_QUE_LA_PAGE_N_EN_PORTE), enMajuscules);

    thenItSaysItIsPartialOf(extrait, PLUS_QUE_LA_PAGE_N_EN_PORTE);
  });

  it('should read an empty extract from a page the server sent without content', () => {
    const extrait = extraitDe({ totalElementsCount: 0 }, enMajuscules);

    thenItCarries(extrait, []);
    thenItSaysItIsComplete(extrait);
  });

  it('should refuse a page the server sent without the count the extract needs', () => {
    thenItRefuses(() => extraitDe({ content: ['Dupont'] }, enMajuscules), 'totalElementsCount');
  });

  const unePageFixture = (noms: string[], nombreTotal: number): PageRest<string> => ({ content: noms, totalElementsCount: nombreTotal });

  const thenItCarries = (extrait: Extrait<string>, elements: string[]): void => {
    expect(extrait.elements).toEqual(elements);
  };

  const thenItSaysItIsComplete = (extrait: Extrait<string>): void => {
    expect(extrait.estComplet()).toBe(true);
  };

  const thenItSaysItIsPartialOf = (extrait: Extrait<string>, nombreTotal: number): void => {
    expect(extrait.estComplet()).toBe(false);
    expect(extrait.nombreTotal).toBe(nombreTotal);
  };

  const thenItRefuses = (lecture: () => unknown, champ: string): void => {
    expect(lecture).toThrow(champ);
  };
});
