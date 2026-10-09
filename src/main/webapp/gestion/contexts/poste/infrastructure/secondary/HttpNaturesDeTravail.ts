import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { collectAllPages } from '@/app/shared/pagination/infrastructure/secondary/collectAllPages';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { NatureDejaExistante } from '../../domain/NatureDejaExistante';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { NatureDeTravailId } from '../../domain/NatureDeTravailId';
import { NatureGeree } from '../../domain/NatureGeree';
import { NaturesDeTravailPort } from '../../domain/NaturesDeTravailPort';

const URN = 'urn:glm:erreur:nature-de-travail:';

const refusEnregistrement = (urn: string | undefined): NatureDejaExistante | undefined =>
  urn === `${URN}nature-deja-existante` ? new NatureDejaExistante() : undefined;

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

  override enregistrer(libelle: NatureDeTravail): Promise<Result<void, NatureDejaExistante>> {
    return this.execute(this.api.write('/api/natures-de-travail', { body: { libelle: libelle.value } }), refusEnregistrement);
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

  private async page(page: number, taille: number): Promise<Page<NatureGeree>> {
    const response = await this.api.read('/api/natures-de-travail', { queryParams: { page, size: taille } });
    return buildPageFrom(
      response,
      nature => new NatureGeree(new NatureDeTravailId(nature.id), new NatureDeTravail(nature.libelle), nature.postes),
      { page, taille },
    );
  }
}
