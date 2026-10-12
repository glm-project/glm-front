import { CategorieDeProduit } from './CategorieDeProduit';
import { CycleDuProduit } from './CycleDuProduit';

export const TAILLE_DES_PAGES = 20;

const pageInvalide = (page: number): boolean => page < 0 || !Number.isInteger(page);

export interface CriteresDesProduits {
  readonly cycle: CycleDuProduit;
  readonly categorie: CategorieDeProduit | undefined;
  readonly recherche: string;
  readonly page: number;
}

export class RequeteProduits {
  readonly taille = TAILLE_DES_PAGES;
  readonly cycle: CycleDuProduit;
  readonly categorie: CategorieDeProduit | undefined;
  readonly recherche: string;
  readonly page: number;

  constructor({ cycle, categorie, recherche, page }: CriteresDesProduits) {
    this.cycle = cycle;
    this.categorie = categorie;
    this.recherche = recherche;
    this.page = page;
    if (pageInvalide(page)) {
      throw new Error('Le numéro de page doit être un entier positif ou nul.');
    }
  }

  avec(changements: Partial<CriteresDesProduits>): RequeteProduits {
    return new RequeteProduits({
      cycle: this.cycle,
      categorie: this.categorie,
      recherche: this.recherche,
      page: this.page,
      ...changements,
    });
  }

  rechercheSaisie(): string | undefined {
    const recherche = this.recherche.trim();
    return recherche === '' ? undefined : recherche;
  }
}
