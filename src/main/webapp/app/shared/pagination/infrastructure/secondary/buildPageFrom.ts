import { Page } from '@/app/shared/pagination/domain/Page';

export const PAGE_SIZE = 100;

export interface RestPage<Wire> {
  content: Wire[];
  currentPage: number;
  pageSize: number;
  totalElementsCount: number;
}

interface RequestedPage {
  readonly page: number;
  readonly taille: number;
}

const mismatchedPage = <Wire>(response: RestPage<Wire>, requested: RequestedPage): boolean =>
  response.currentPage !== requested.page || response.pageSize !== requested.taille;

export const buildPageFrom = <Wire, Model>(
  page: RestPage<Wire>,
  toModel: (element: Wire) => Model,
  requested?: RequestedPage,
): Page<Model> => {
  if (requested !== undefined) {
    if (mismatchedPage(page, requested)) {
      throw new Error('La page reçue ne correspond pas à la page demandée.');
    }
  }
  return new Page(page.content.map(toModel), page.totalElementsCount);
};
