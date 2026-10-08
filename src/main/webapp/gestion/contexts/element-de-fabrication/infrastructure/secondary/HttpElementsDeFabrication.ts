import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { collectAllPages } from '@/app/shared/pagination/infrastructure/secondary/collectAllPages';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { CategorieDeProduit } from '../../domain/CategorieDeProduit';
import { CategorieInconnue } from '../../domain/CategorieInconnue';
import { CommandeCreationElement } from '../../domain/CommandeCreationElement';
import { CommandeModificationElement } from '../../domain/CommandeModificationElement';
import { ElementDeFabrication } from '../../domain/ElementDeFabrication';
import { ElementDeFabricationId } from '../../domain/ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ElementsDeFabricationPort } from '../../domain/ElementsDeFabricationPort';
import { LibelleDElement } from '../../domain/LibelleDElement';
import { NomDElement } from '../../domain/NomDElement';
import { ReferenceDElement } from '../../domain/ReferenceDElement';
import { ReferenceDejaUtilisee } from '../../domain/ReferenceDejaUtilisee';
import { ReferentielDesProduits } from '../../domain/ReferentielDesProduits';
import { RefusCreationElement } from '../../domain/RefusCreationElement';
import { RefusModificationElement } from '../../domain/RefusModificationElement';
import { RequeteElements } from '../../domain/RequeteElements';

type RestElement = components['schemas']['RestElementDeFabrication'];

const PERIODE_DEPUIS_TOUJOURS = { debut: '1970-01-01T00:00:00Z', fin: '2999-12-31T23:59:59Z' };

const toReference = (reference: string | undefined): ReferenceDElement | undefined =>
  reference === undefined ? undefined : new ReferenceDElement(reference);

const toLibelle = (description: string | undefined): LibelleDElement | undefined =>
  description === undefined ? undefined : new LibelleDElement(description);

const toElement = (element: RestElement): ElementDeFabrication =>
  new ElementDeFabrication(new ElementDeFabricationId(required(element.id, 'element.id')), {
    categorie: new CategorieDeProduit(required(element.categorie, 'element.categorie')),
    nom: new NomDElement(required(element.nom, 'element.nom')),
    reference: toReference(element.reference),
    libelle: toLibelle(element.description),
  });

const toFiche = (
  commande: CommandeCreationElement | CommandeModificationElement,
): components['schemas']['RestModificationElementDeFabrication'] => ({
  ...(commande.reference === undefined ? {} : { reference: commande.reference.value }),
  ...(commande.libelle === undefined ? {} : { description: commande.libelle.value }),
});

const refusCreation = (urn: string | undefined): RefusCreationElement | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:element-de-fabrication:reference-deja-utilisee':
      return new ReferenceDejaUtilisee();
    case 'urn:glm:erreur:element-de-fabrication:categorie-inconnue':
      return new CategorieInconnue();
    default:
      return undefined;
  }
};

const refusModification = (urn: string | undefined): RefusModificationElement | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:element-de-fabrication:reference-deja-utilisee':
      return new ReferenceDejaUtilisee();
    case 'urn:glm:erreur:element-de-fabrication:element-de-fabrication-introuvable':
      return new ElementDeFabricationIntrouvable();
    default:
      return undefined;
  }
};

@Injectable()
export class HttpElementsDeFabrication extends ElementsDeFabricationPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async referentiel(): Promise<ReferentielDesProduits> {
    try {
      const [categories, elements] = await Promise.all([
        collectAllPages(
          (page, size) => this.categories(page, size),
          categorie => categorie.value,
        ),
        collectAllPages(
          (page, size) => this.elements(new RequeteElements(page, size)),
          entry => entry.id.value,
        ),
      ]);
      return new ReferentielDesProduits(categories, elements);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async elements(requete: RequeteElements): Promise<Page<ElementDeFabrication>> {
    const response = await this.api.read('/api/elements-de-fabrication', {
      queryParams: { ...PERIODE_DEPUIS_TOUJOURS, page: requete.page, size: requete.taille },
    });
    return buildPageFrom(response, toElement, requete);
  }

  private async categories(page: number, taille: number): Promise<Page<CategorieDeProduit>> {
    const response = await this.api.read('/api/categories-de-produit', { queryParams: { page, size: taille } });
    return buildPageFrom(response, categorie => new CategorieDeProduit(categorie.code), { page, taille });
  }

  override creer(commande: CommandeCreationElement): Promise<Result<void, RefusCreationElement>> {
    return this.execute(
      this.api.write('/api/elements-de-fabrication', { body: { categorie: commande.categorie.value, ...toFiche(commande) } }),
      refusCreation,
    );
  }

  override modifier(commande: CommandeModificationElement): Promise<Result<void, RefusModificationElement>> {
    return this.execute(
      this.api.update('/api/elements-de-fabrication/{id}', { pathParams: { id: commande.id.value }, body: toFiche(commande) }),
      refusModification,
    );
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
