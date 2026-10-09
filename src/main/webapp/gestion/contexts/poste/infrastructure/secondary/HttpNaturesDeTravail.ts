import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { collectAllPages } from '@/app/shared/pagination/infrastructure/secondary/collectAllPages';
import { inject, Injectable } from '@angular/core';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { NatureDeTravailId } from '../../domain/NatureDeTravailId';
import { NatureGeree } from '../../domain/NatureGeree';
import { NaturesDeTravailPort } from '../../domain/NaturesDeTravailPort';

@Injectable()
export class HttpNaturesDeTravail extends NaturesDeTravailPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async natures(): Promise<readonly NatureGeree[]> {
    try {
      return await collectAllPages(
        (page, size) => this.page(page, size),
        nature => nature.id.value,
      );
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private async page(page: number, taille: number): Promise<Page<NatureGeree>> {
    const response = await this.api.read('/api/natures-de-travail', { queryParams: { page, size: taille } });
    return buildPageFrom(
      response,
      nature => new NatureGeree(new NatureDeTravailId(nature.id), new NatureDeTravail(nature.libelle), nature.postes),
      { page, taille },
    );
  }
}
