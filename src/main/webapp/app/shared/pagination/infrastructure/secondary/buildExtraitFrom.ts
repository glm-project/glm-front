import { Extrait } from '@/app/shared/pagination/domain/Extrait';

export const PLAFOND_DE_PAGE = 100;

export interface PageRest<Fil> {
  content: Fil[];
  currentPage: number;
  pageSize: number;
  totalElementsCount: number;
}

export const buildExtraitFrom = <Fil, Modele>(page: PageRest<Fil>, toModele: (element: Fil) => Modele): Extrait<Modele> =>
  new Extrait(page.content.map(toModele), page.totalElementsCount);
