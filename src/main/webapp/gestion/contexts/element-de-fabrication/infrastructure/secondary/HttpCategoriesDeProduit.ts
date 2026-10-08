import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { collectAllPages } from '@/app/shared/pagination/infrastructure/secondary/collectAllPages';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { CategorieDejaExistante } from '../../domain/CategorieDejaExistante';
import { CategorieDeProduit } from '../../domain/CategorieDeProduit';
import { CategorieIntrouvable } from '../../domain/CategorieIntrouvable';
import { CategoriesDeProduitPort } from '../../domain/CategoriesDeProduitPort';
import { CategorieUtilisee } from '../../domain/CategorieUtilisee';
import { OrdreDesCategories } from '../../domain/OrdreDesCategories';
import { OrdreIncomplet } from '../../domain/OrdreIncomplet';
import { RefusSuppressionCategorie } from '../../domain/RefusSuppressionCategorie';

const URN = 'urn:glm:erreur:categorie-de-produit:';

const refusDeclaration = (urn: string | undefined): CategorieDejaExistante | undefined =>
  urn === `${URN}categorie-deja-existante` ? new CategorieDejaExistante() : undefined;

const refusReordonnancement = (urn: string | undefined): OrdreIncomplet | undefined =>
  urn === `${URN}ordre-incomplet` ? new OrdreIncomplet() : undefined;

const refusSuppression = (urn: string | undefined): RefusSuppressionCategorie | undefined => {
  switch (urn) {
    case `${URN}categorie-utilisee`:
      return new CategorieUtilisee();
    case `${URN}categorie-introuvable`:
      return new CategorieIntrouvable();
    default:
      return undefined;
  }
};

@Injectable()
export class HttpCategoriesDeProduit extends CategoriesDeProduitPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async categories(): Promise<readonly CategorieDeProduit[]> {
    try {
      return await collectAllPages(
        (page, size) => this.page(page, size),
        categorie => categorie.value,
      );
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override declarer(categorie: CategorieDeProduit): Promise<Result<void, CategorieDejaExistante>> {
    return this.execute(this.api.write('/api/categories-de-produit', { body: { code: categorie.value } }), refusDeclaration);
  }

  override reordonner(ordre: OrdreDesCategories): Promise<Result<void, OrdreIncomplet>> {
    return this.execute(
      this.api.update('/api/categories-de-produit/ordre', { body: { codes: ordre.categories.map(categorie => categorie.value) } }),
      refusReordonnancement,
    );
  }

  override supprimer(categorie: CategorieDeProduit): Promise<Result<void, RefusSuppressionCategorie>> {
    return this.execute(this.api.delete('/api/categories-de-produit/{code}', { pathParams: { code: categorie.value } }), refusSuppression);
  }

  private async page(page: number, taille: number): Promise<Page<CategorieDeProduit>> {
    const response = await this.api.read('/api/categories-de-produit', { queryParams: { page, size: taille } });
    return buildPageFrom(response, categorie => new CategorieDeProduit(categorie.code), { page, taille });
  }

  private async execute<Refus>(
    operation: Promise<unknown>,
    translate: (urn: string | undefined) => Refus | undefined,
  ): Promise<Result<void, Refus>> {
    try {
      await operation;
      return ok(undefined);
    } catch (failure) {
      const refus = translate(findApiErrorIn(failure)?.urn);
      if (refus === undefined) {
        throw failure;
      }
      return err(refus);
    }
  }
}
