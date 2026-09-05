import { Page } from '@/app/shared/pagination/domain/Page';

export const PAGE_SIZE = 100;

export interface RestPage<Wire> {
  content: Wire[];
  currentPage: number;
  pageSize: number;
  totalElementsCount: number;
}

export const buildPageFrom = <Wire, Model>(page: RestPage<Wire>, toModel: (element: Wire) => Model): Page<Model> =>
  new Page(page.content.map(toModel), page.totalElementsCount);
