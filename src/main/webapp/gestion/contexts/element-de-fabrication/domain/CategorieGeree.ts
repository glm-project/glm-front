import { CategorieDeProduit } from './CategorieDeProduit';

export class CategorieGeree {
  constructor(
    readonly categorie: CategorieDeProduit,
    readonly supprimable: boolean,
  ) {}
}
