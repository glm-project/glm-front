import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom, PAGE_SIZE } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { CommandeEnregistrementPoste } from '../../domain/CommandeEnregistrementPoste';
import { CoutHoraire } from '../../domain/CoutHoraire';
import { LibellePoste } from '../../domain/LibellePoste';
import { LibellePosteDejaUtilise } from '../../domain/LibellePosteDejaUtilise';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { PosteDeTravail } from '../../domain/PosteDeTravail';
import { PosteDeTravailId } from '../../domain/PosteDeTravailId';
import { PosteIntrouvable } from '../../domain/PosteIntrouvable';
import { PosteNonSupprimable } from '../../domain/PosteNonSupprimable';
import { PostesPort } from '../../domain/PostesPort';
import { RefusEnregistrementPoste } from '../../domain/RefusEnregistrementPoste';
import { RefusSuppressionPoste } from '../../domain/RefusSuppressionPoste';

const toPoste = (poste: components['schemas']['RestPosteDeTravail']): PosteDeTravail =>
  new PosteDeTravail(new PosteDeTravailId(poste.id), {
    libelle: new LibellePoste(poste.libelle),
    nature: new NatureDeTravail(poste.nature),
    coutHoraire: poste.coutHoraire === undefined ? undefined : new CoutHoraire(poste.coutHoraire),
  });

const toRequest = (commande: CommandeEnregistrementPoste): components['schemas']['RestCreationPosteDeTravail'] => ({
  libelle: commande.libelle.value,
  nature: commande.nature.value,
  ...(commande.coutHoraire === undefined ? {} : { coutHoraire: commande.coutHoraire.value }),
});

const refusEnregistrement = (urn: string | undefined): RefusEnregistrementPoste | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:poste-de-travail:libelle-deja-utilise':
      return new LibellePosteDejaUtilise();
    case 'urn:glm:erreur:poste-de-travail:poste-de-travail-introuvable':
      return new PosteIntrouvable();
    default:
      return undefined;
  }
};

const refusSuppression = (urn: string | undefined): RefusSuppressionPoste | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:poste-de-travail:poste-de-travail-pointe':
    case 'urn:glm:erreur:poste-de-travail:poste-de-travail-utilise':
      return new PosteNonSupprimable();
    case 'urn:glm:erreur:poste-de-travail:poste-de-travail-introuvable':
      return new PosteIntrouvable();
    default:
      return undefined;
  }
};

const pageManquante = (extrait: Page<PosteDeTravail>, lus: number): boolean => extrait.elements.length === 0 && lus < extrait.totalCount;

@Injectable()
export class HttpPostes extends PostesPort {
  private readonly api = inject(ApiClient);

  override async postes(page: number, taille: number): Promise<Page<PosteDeTravail>> {
    const response = await this.api.read('/api/postes-de-travail', { queryParams: { page, size: taille } });
    return buildPageFrom(response, toPoste);
  }

  override async natures(): Promise<readonly NatureDeTravail[]> {
    const natures = new Map<string, NatureDeTravail>();
    let page = 0;
    let lus = 0;
    let total: number;
    do {
      const extrait = await this.postes(page, PAGE_SIZE);
      total = extrait.totalCount;
      lus += extrait.elements.length;
      if (pageManquante(extrait, lus)) {
        throw new Error('Le référentiel des natures est incomplet.');
      }
      for (const poste of extrait.elements) {
        natures.set(poste.nature.value, poste.nature);
      }
      page += 1;
    } while (lus < total);
    return [...natures.values()].sort((left, right) => left.value.localeCompare(right.value, 'fr'));
  }
  override creer(commande: CommandeEnregistrementPoste): Promise<Result<void, RefusEnregistrementPoste>> {
    return this.execute(this.api.write('/api/postes-de-travail', { body: toRequest(commande) }), refusEnregistrement);
  }

  override modifier(id: PosteDeTravailId, commande: CommandeEnregistrementPoste): Promise<Result<void, RefusEnregistrementPoste>> {
    return this.execute(
      this.api.update('/api/postes-de-travail/{id}', { pathParams: { id: id.value }, body: toRequest(commande) }),
      refusEnregistrement,
    );
  }

  override supprimer(id: PosteDeTravailId): Promise<Result<void, RefusSuppressionPoste>> {
    return this.execute(this.api.delete('/api/postes-de-travail/{id}', { pathParams: { id: id.value } }), refusSuppression);
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
