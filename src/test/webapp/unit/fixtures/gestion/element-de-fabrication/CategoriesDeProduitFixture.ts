import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CategorieDejaExistante } from '@/gestion/contexts/element-de-fabrication/domain/CategorieDejaExistante';
import { CategorieDeProduit } from '@/gestion/contexts/element-de-fabrication/domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '@/gestion/contexts/element-de-fabrication/domain/CategoriesDeProduitPort';
import { OrdreDesCategories } from '@/gestion/contexts/element-de-fabrication/domain/OrdreDesCategories';
import { OrdreIncomplet } from '@/gestion/contexts/element-de-fabrication/domain/OrdreIncomplet';

export class CategoriesDeProduitFixture extends CategoriesDeProduitPort {
  liste: readonly CategorieDeProduit[] = [];
  readonly declarations: CategorieDeProduit[] = [];
  readonly ordres: OrdreDesCategories[] = [];
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  declarationDifferee: Promise<Result<void, CategorieDejaExistante>> | undefined;

  override categories(): Promise<readonly CategorieDeProduit[]> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return Promise.resolve([...this.liste]);
  }

  override async declarer(categorie: CategorieDeProduit): Promise<Result<void, CategorieDejaExistante>> {
    this.declarations.push(categorie);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.declarationDifferee !== undefined) return this.declarationDifferee;
    if (this.liste.some(existante => existante.estLaMeme(categorie))) return err(new CategorieDejaExistante());
    this.liste = [...this.liste, categorie];
    return ok(undefined);
  }

  override async reordonner(ordre: OrdreDesCategories): Promise<Result<void, OrdreIncomplet>> {
    this.ordres.push(ordre);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (!this.estComplet(ordre)) return err(new OrdreIncomplet());
    this.liste = ordre.categories;
    return ok(undefined);
  }

  private estComplet(ordre: OrdreDesCategories): boolean {
    return (
      ordre.categories.length === this.liste.length
      && ordre.categories.every(categorie => this.liste.some(existante => existante.estLaMeme(categorie)))
    );
  }
}
