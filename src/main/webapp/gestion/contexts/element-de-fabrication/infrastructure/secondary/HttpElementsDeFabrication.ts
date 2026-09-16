import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
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
import { RefusModificationElement } from '../../domain/RefusModificationElement';
import { RequeteElements } from '../../domain/RequeteElements';

type RestElement = components['schemas']['RestElementDeFabrication'];

/**
 * Le référentiel ne porte aucune période : seul le suivi d'atelier a des dates. La route exige pourtant
 * `debut` et `fin`, qui filtrent la date de création, alors l'adapter demande toute l'amplitude et l'écran
 * n'expose aucun filtre temporel.
 */
const PERIODE_DEPUIS_TOUJOURS = { debut: '1970-01-01T00:00:00Z', fin: '2999-12-31T23:59:59Z' };

const toReference = (reference: string | undefined): ReferenceDElement | undefined =>
  reference === undefined ? undefined : new ReferenceDElement(reference);

const toLibelle = (description: string | undefined): LibelleDElement | undefined =>
  description === undefined ? undefined : new LibelleDElement(description);

const toElement = (element: RestElement): ElementDeFabrication =>
  new ElementDeFabrication(new ElementDeFabricationId(required(element.id, 'element.id')), {
    type: required(element.type, 'element.type'),
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

const refusCreation = (urn: string | undefined): ReferenceDejaUtilisee | undefined => {
  if (urn === 'urn:glm:erreur:element-de-fabrication:reference-deja-utilisee') {
    return new ReferenceDejaUtilisee();
  }
  return undefined;
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

  override async elements(requete: RequeteElements): Promise<Page<ElementDeFabrication>> {
    try {
      const response = await this.api.read('/api/elements-de-fabrication', {
        queryParams: { ...PERIODE_DEPUIS_TOUJOURS, page: requete.page, size: requete.taille },
      });
      return buildPageFrom(response, toElement);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override creer(commande: CommandeCreationElement): Promise<Result<void, ReferenceDejaUtilisee>> {
    return this.execute(
      this.api.write('/api/elements-de-fabrication', { body: { type: commande.type, ...toFiche(commande) } }),
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
