import { verifieLaPagination } from './InvariantsDePage';

export class RequeteEngageables {
  constructor(
    readonly page: number,
    readonly taille: number,
  ) {
    verifieLaPagination(page, taille);
  }
}
