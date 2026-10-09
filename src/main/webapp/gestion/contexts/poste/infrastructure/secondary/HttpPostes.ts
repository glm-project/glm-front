import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { collectAllPages } from '@/app/shared/pagination/infrastructure/secondary/collectAllPages';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { CommandeCreationPoste } from '../../domain/CommandeCreationPoste';
import { CommandeModificationPoste } from '../../domain/CommandeModificationPoste';
import { CoutHoraire } from '../../domain/CoutHoraire';
import { LibellePoste } from '../../domain/LibellePoste';
import { LibellePosteDejaUtilise } from '../../domain/LibellePosteDejaUtilise';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { NatureDeTravailId } from '../../domain/NatureDeTravailId';
import { PosteDeTravail } from '../../domain/PosteDeTravail';
import { PosteDeTravailId } from '../../domain/PosteDeTravailId';
import { PosteIntrouvable } from '../../domain/PosteIntrouvable';
import { PosteNonSupprimable } from '../../domain/PosteNonSupprimable';
import { PostesPort } from '../../domain/PostesPort';
import { RefusModificationPoste } from '../../domain/RefusModificationPoste';
import { RefusSuppressionPoste } from '../../domain/RefusSuppressionPoste';
import { RequetePostes } from '../../domain/RequetePostes';

const toPoste = (poste: components['schemas']['RestPosteDeTravail']): PosteDeTravail =>
  new PosteDeTravail(new PosteDeTravailId(poste.id), {
    libelle: new LibellePoste(poste.libelle),
    nature: new NatureDeTravail(poste.nature),
    natureId: new NatureDeTravailId(poste.natureId),
    coutHoraire: poste.coutHoraire === undefined ? undefined : new CoutHoraire(poste.coutHoraire),
  });

const toRequest = (commande: CommandeCreationPoste | CommandeModificationPoste): components['schemas']['RestCreationPosteDeTravail'] => ({
  libelle: commande.libelle.value,
  natureId: commande.natureId.value,
  ...(commande.coutHoraire === undefined ? {} : { coutHoraire: commande.coutHoraire.value }),
});

const refusCreation = (urn: string | undefined): LibellePosteDejaUtilise | undefined => {
  if (urn === 'urn:glm:erreur:poste-de-travail:libelle-deja-utilise') {
    return new LibellePosteDejaUtilise();
  }
  return undefined;
};

const refusModification = (urn: string | undefined): RefusModificationPoste | undefined => {
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

@Injectable()
export class HttpPostes extends PostesPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async referentiel(): Promise<readonly PosteDeTravail[]> {
    try {
      return await collectAllPages(
        (page, size) => this.postes(new RequetePostes(page, size)),
        entry => entry.id.value,
      );
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async postes(requete: RequetePostes): Promise<Page<PosteDeTravail>> {
    return await this.fetchPage(requete);
  }

  private async fetchPage(requete: RequetePostes): Promise<Page<PosteDeTravail>> {
    const response = await this.api.read('/api/postes-de-travail', {
      queryParams: { page: requete.page, size: requete.taille },
    });
    return buildPageFrom(response, toPoste, requete);
  }

  override creer(commande: CommandeCreationPoste): Promise<Result<void, LibellePosteDejaUtilise>> {
    return this.execute(this.api.write('/api/postes-de-travail', { body: toRequest(commande) }), refusCreation);
  }

  override modifier(commande: CommandeModificationPoste): Promise<Result<void, RefusModificationPoste>> {
    return this.execute(
      this.api.update('/api/postes-de-travail/{id}', { pathParams: { id: commande.id.value }, body: toRequest(commande) }),
      refusModification,
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
