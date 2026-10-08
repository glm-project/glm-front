import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CategorieDejaExistante } from '@/gestion/contexts/element-de-fabrication/domain/CategorieDejaExistante';
import { CategorieDeProduit } from '@/gestion/contexts/element-de-fabrication/domain/CategorieDeProduit';
import { CategorieGeree } from '@/gestion/contexts/element-de-fabrication/domain/CategorieGeree';
import { CategorieIntrouvable } from '@/gestion/contexts/element-de-fabrication/domain/CategorieIntrouvable';
import { CategoriesDeProduitPort } from '@/gestion/contexts/element-de-fabrication/domain/CategoriesDeProduitPort';
import { CategorieUtilisee } from '@/gestion/contexts/element-de-fabrication/domain/CategorieUtilisee';
import { OrdreDesCategories } from '@/gestion/contexts/element-de-fabrication/domain/OrdreDesCategories';
import { OrdreIncomplet } from '@/gestion/contexts/element-de-fabrication/domain/OrdreIncomplet';
import { RefusSuppressionCategorie } from '@/gestion/contexts/element-de-fabrication/domain/RefusSuppressionCategorie';

export class CategoriesDeProduitFixture extends CategoriesDeProduitPort {
  liste: readonly CategorieDeProduit[] = [];
  readonly declarations: CategorieDeProduit[] = [];
  readonly ordres: OrdreDesCategories[] = [];
  readonly suppressions: CategorieDeProduit[] = [];
  utilisees: readonly string[] = [];
  lectureFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  declarationDifferee: Promise<Result<void, CategorieDejaExistante>> | undefined;

  override categories(): Promise<readonly CategorieGeree[]> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return Promise.resolve(this.liste.map(categorie => new CategorieGeree(categorie, !this.utilisees.includes(categorie.value))));
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

  override async supprimer(categorie: CategorieDeProduit): Promise<Result<void, RefusSuppressionCategorie>> {
    this.suppressions.push(categorie);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (!this.liste.some(existante => existante.estLaMeme(categorie))) return err(new CategorieIntrouvable());
    if (this.utilisees.includes(categorie.value)) return err(new CategorieUtilisee());
    this.liste = this.liste.filter(existante => !existante.estLaMeme(categorie));
    return ok(undefined);
  }

  private estComplet(ordre: OrdreDesCategories): boolean {
    return (
      ordre.categories.length === this.liste.length
      && ordre.categories.every(categorie => this.liste.some(existante => existante.estLaMeme(categorie)))
    );
  }
}
