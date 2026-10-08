import { CategorieDeProduit } from './CategorieDeProduit';

export class OrdreDesCategories {
  readonly categories: readonly CategorieDeProduit[];

  constructor(categories: readonly CategorieDeProduit[]) {
    this.categories = [...categories];
  }

  estPremiere(categorie: CategorieDeProduit): boolean {
    return this.rangDe(categorie) === 0;
  }

  estDerniere(categorie: CategorieDeProduit): boolean {
    return this.rangDe(categorie) === this.categories.length - 1;
  }

  apresMontee(categorie: CategorieDeProduit): OrdreDesCategories {
    return this.apresEchange(this.rangDe(categorie) - 1);
  }

  apresDescente(categorie: CategorieDeProduit): OrdreDesCategories {
    return this.apresEchange(this.rangDe(categorie));
  }

  private rangDe(categorie: CategorieDeProduit): number {
    return this.categories.findIndex(candidate => candidate.estLaMeme(categorie));
  }

  private aDeuxVoisines(premier: number): boolean {
    return premier >= 0 && premier + 1 < this.categories.length;
  }

  private apresEchange(premier: number): OrdreDesCategories {
    if (!this.aDeuxVoisines(premier)) {
      return this;
    }
    const voisines = this.categories.slice(premier, premier + 2).reverse();
    return new OrdreDesCategories([...this.categories.slice(0, premier), ...voisines, ...this.categories.slice(premier + 2)]);
  }
}
