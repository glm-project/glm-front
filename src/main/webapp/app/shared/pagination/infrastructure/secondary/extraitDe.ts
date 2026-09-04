import { obligatoire } from '@/app/shared/api-client/infrastructure/secondary/obligatoire';
import { Extrait } from '@/app/shared/pagination/domain/Extrait';

export const PLAFOND_DE_PAGE = 100;

export interface PageRest<Fil> {
  content?: Fil[];
  totalElementsCount?: number;
}

export const extraitDe = <Fil, Modele>(page: PageRest<Fil>, versLeModele: (element: Fil) => Modele): Extrait<Modele> =>
  new Extrait((page.content ?? []).map(versLeModele), obligatoire(page.totalElementsCount, 'page.totalElementsCount'));
