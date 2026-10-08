import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CategorieDejaExistante } from '@/gestion/contexts/element-de-fabrication/domain/CategorieDejaExistante';
import { CategorieDeProduit } from '@/gestion/contexts/element-de-fabrication/domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '@/gestion/contexts/element-de-fabrication/domain/CategoriesDeProduitPort';

export class CategoriesDeProduitFixture extends CategoriesDeProduitPort {
  liste: readonly CategorieDeProduit[] = [];
  readonly declarations: CategorieDeProduit[] = [];
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
}
