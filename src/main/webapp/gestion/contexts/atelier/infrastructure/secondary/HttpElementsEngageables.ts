import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { inject, Injectable } from '@angular/core';
import { DesignationDElement } from '../../domain/DesignationDElement';
import { ElementEngageable } from '../../domain/ElementEngageable';
import { ElementEngageId } from '../../domain/ElementEngageId';
import { ElementsEngageablesPort } from '../../domain/ElementsEngageablesPort';
import { RequeteEngageables } from '../../domain/RequeteEngageables';

type RestElement = components['schemas']['RestElementDeFabrication'];

/**
 * Le référentiel ne porte aucune période, mais la route exige `debut` et `fin`, qui filtrent la date de
 * création. L'adapter demande toute l'amplitude ; choisir un élément à engager n'a rien d'une question de date.
 */
const PERIODE_DEPUIS_TOUJOURS = { debut: '1970-01-01T00:00:00Z', fin: '2999-12-31T23:59:59Z' };

const ELEMENT_INTROUVABLE = 'urn:glm:erreur:element-de-fabrication:element-de-fabrication-introuvable';

const toEngageable = (element: RestElement): ElementEngageable =>
  new ElementEngageable(new ElementEngageId(required(element.id, 'element.id')), {
    designation: new DesignationDElement(element.reference, required(element.nom, 'element.nom')),
    type: required(element.type, 'element.type'),
  });

@Injectable()
export class HttpElementsEngageables extends ElementsEngageablesPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async elements(requete: RequeteEngageables): Promise<Page<ElementEngageable>> {
    try {
      const response = await this.api.read('/api/elements-de-fabrication', {
        queryParams: { ...PERIODE_DEPUIS_TOUJOURS, page: requete.page, size: requete.taille },
      });
      return buildPageFrom(response, toEngageable);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async element(id: ElementEngageId): Promise<ElementEngageable | undefined> {
    try {
      return toEngageable(await this.api.read('/api/elements-de-fabrication/{id}', { pathParams: { id: id.value } }));
    } catch (failure) {
      if (findApiErrorIn(failure)?.urn === ELEMENT_INTROUVABLE) {
        return undefined;
      }
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
