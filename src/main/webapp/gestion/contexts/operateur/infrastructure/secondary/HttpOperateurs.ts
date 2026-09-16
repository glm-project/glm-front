import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom, PAGE_SIZE } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { CommandeCreationOperateur } from '../../domain/CommandeCreationOperateur';
import { CommandeModificationOperateur } from '../../domain/CommandeModificationOperateur';
import { IdentiteDejaUtilisee } from '../../domain/IdentiteDejaUtilisee';
import { Matricule } from '../../domain/Matricule';
import { MatriculeDejaUtilise } from '../../domain/MatriculeDejaUtilise';
import { NomOperateur } from '../../domain/NomOperateur';
import { Operateur } from '../../domain/Operateur';
import { OperateurAyantPointe } from '../../domain/OperateurAyantPointe';
import { OperateurId } from '../../domain/OperateurId';
import { OperateurIntrouvable } from '../../domain/OperateurIntrouvable';
import { OperateursPort } from '../../domain/OperateursPort';
import { PosteHabilitable } from '../../domain/PosteHabilitable';
import { PosteHabilitableId } from '../../domain/PosteHabilitableId';
import { PosteHabilitableIntrouvable } from '../../domain/PosteHabilitableIntrouvable';
import { PrenomOperateur } from '../../domain/PrenomOperateur';
import { RefusCreationOperateur } from '../../domain/RefusCreationOperateur';
import { RefusModificationOperateur } from '../../domain/RefusModificationOperateur';
import { RefusSuppressionOperateur } from '../../domain/RefusSuppressionOperateur';
import { RequeteOperateurs } from '../../domain/RequeteOperateurs';
import { TauxHoraire } from '../../domain/TauxHoraire';

type RestPosteDeTravail = components['schemas']['RestPosteDeTravail'];
type RestPosteHabilite = components['schemas']['RestPosteHabilite'];

const toPosteHabilitable = (poste: RestPosteHabilite | RestPosteDeTravail): PosteHabilitable =>
  new PosteHabilitable(new PosteHabilitableId(poste.id), { libelle: poste.libelle, nature: poste.nature });

const toOperateur = (operateur: components['schemas']['RestOperateur']): Operateur =>
  new Operateur(new OperateurId(operateur.id), {
    nom: new NomOperateur(operateur.nom),
    prenom: new PrenomOperateur(operateur.prenom),
    matricule: operateur.matricule === undefined ? undefined : new Matricule(operateur.matricule),
    tauxHoraire: operateur.tauxHoraire === undefined ? undefined : new TauxHoraire(operateur.tauxHoraire),
    postes: operateur.postes.map(toPosteHabilitable),
    natures: operateur.natures,
  });

const toRequest = (
  commande: CommandeCreationOperateur | CommandeModificationOperateur,
): components['schemas']['RestCreationOperateur'] => ({
  nom: commande.nom.value,
  prenom: commande.prenom.value,
  postes: commande.postes.map(poste => poste.value),
  ...(commande.matricule === undefined ? {} : { matricule: commande.matricule.value }),
  ...(commande.tauxHoraire === undefined ? {} : { tauxHoraire: commande.tauxHoraire.value }),
});

const refusCreation = (urn: string | undefined): RefusCreationOperateur | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:operateur:identite-deja-utilisee':
      return new IdentiteDejaUtilisee();
    case 'urn:glm:erreur:operateur:matricule-deja-utilise':
      return new MatriculeDejaUtilise();
    case 'urn:glm:erreur:operateur:poste-de-travail-introuvable':
      return new PosteHabilitableIntrouvable();
    default:
      return undefined;
  }
};

const refusModification = (urn: string | undefined): RefusModificationOperateur | undefined => {
  if (urn === 'urn:glm:erreur:operateur:operateur-introuvable') {
    return new OperateurIntrouvable();
  }
  return refusCreation(urn);
};

const refusSuppression = (urn: string | undefined): RefusSuppressionOperateur | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:operateur:operateur-introuvable':
      return new OperateurIntrouvable();
    case 'urn:glm:erreur:operateur:operateur-ayant-pointe':
      return new OperateurAyantPointe();
    default:
      return undefined;
  }
};

const pageManquante = (extrait: Page<PosteHabilitable>, lus: number): boolean => extrait.elements.length === 0 && lus < extrait.totalCount;

@Injectable()
export class HttpOperateurs extends OperateursPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);
  private cachedPostes: readonly PosteHabilitable[] | undefined;

  override async operateurs(requete: RequeteOperateurs): Promise<Page<Operateur>> {
    try {
      const response = await this.api.read('/api/operateurs', {
        queryParams: { page: requete.page, size: requete.taille },
      });
      return buildPageFrom(response, toOperateur);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async postesHabilitables(): Promise<readonly PosteHabilitable[]> {
    if (this.cachedPostes !== undefined) {
      return this.cachedPostes;
    }
    try {
      this.cachedPostes = await this.readAllPostes();
      return this.cachedPostes;
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private async readAllPostes(): Promise<readonly PosteHabilitable[]> {
    const postes: PosteHabilitable[] = [];
    let page = 0;
    let total: number;
    do {
      const extrait = await this.fetchPostesPage(page);
      total = extrait.totalCount;
      if (pageManquante(extrait, postes.length)) {
        throw new Error('Le référentiel des postes est incomplet.');
      }
      postes.push(...extrait.elements);
      page += 1;
    } while (postes.length < total);
    return postes.sort((left, right) => left.compare(right));
  }

  private async fetchPostesPage(page: number): Promise<Page<PosteHabilitable>> {
    const response = await this.api.read('/api/postes-de-travail', { queryParams: { page, size: PAGE_SIZE } });
    return buildPageFrom(response, toPosteHabilitable);
  }

  override creer(commande: CommandeCreationOperateur): Promise<Result<void, RefusCreationOperateur>> {
    return this.execute(this.api.write('/api/operateurs', { body: toRequest(commande) }), refusCreation);
  }

  override modifier(commande: CommandeModificationOperateur): Promise<Result<void, RefusModificationOperateur>> {
    return this.execute(
      this.api.update('/api/operateurs/{id}', { pathParams: { id: commande.id.value }, body: toRequest(commande) }),
      refusModification,
    );
  }

  override supprimer(id: OperateurId): Promise<Result<void, RefusSuppressionOperateur>> {
    return this.execute(this.api.delete('/api/operateurs/{id}', { pathParams: { id: id.value } }), refusSuppression);
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
