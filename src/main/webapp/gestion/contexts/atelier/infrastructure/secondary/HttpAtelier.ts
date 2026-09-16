import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { buildPageFrom } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { inject, Injectable } from '@angular/core';
import { ActeDAtelier } from '../../domain/ActeDAtelier';
import { AtelierPort } from '../../domain/AtelierPort';
import { ElementALAtelier } from '../../domain/ElementALAtelier';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ElementDejaALAtelier } from '../../domain/ElementDejaALAtelier';
import { ElementEngageId } from '../../domain/ElementEngageId';
import { InstantDAtelier } from '../../domain/InstantDAtelier';
import { NomDElementEngage } from '../../domain/NomDElementEngage';
import { RefusMiseALAtelier } from '../../domain/RefusMiseALAtelier';
import { RequeteAtelier } from '../../domain/RequeteAtelier';
import { SuiviId } from '../../domain/SuiviId';
import { SuiviIntrouvable } from '../../domain/SuiviIntrouvable';

type RestSuivi = components['schemas']['RestSuiviDAtelierEnGrille'];

const toCloture = (suivi: RestSuivi): ActeDAtelier | undefined =>
  suivi.clotureLe === undefined
    ? undefined
    : new ActeDAtelier(new InstantDAtelier(suivi.clotureLe), required(suivi.cloturePar, 'suivi.cloturePar'));

const toElement = (suivi: RestSuivi): ElementALAtelier =>
  new ElementALAtelier(new SuiviId(suivi.id), {
    nom: new NomDElementEngage(suivi.nom),
    type: suivi.type,
    etat: suivi.etat,
    engagement: new ActeDAtelier(new InstantDAtelier(suivi.engageLe), suivi.engagePar),
    cloture: toCloture(suivi),
  });

const refusMiseALAtelier = (urn: string | undefined): RefusMiseALAtelier | undefined => {
  switch (urn) {
    case 'urn:glm:erreur:atelier:element-deja-engage':
      return new ElementDejaALAtelier();
    case 'urn:glm:erreur:atelier:element-de-fabrication-introuvable':
      return new ElementDeFabricationIntrouvable();
    default:
      return undefined;
  }
};

const refusSurLeSuivi = (urn: string | undefined): SuiviIntrouvable | undefined =>
  urn === 'urn:glm:erreur:atelier:suivi-d-atelier-introuvable' ? new SuiviIntrouvable() : undefined;

@Injectable()
export class HttpAtelier extends AtelierPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async elements(requete: RequeteAtelier): Promise<Page<ElementALAtelier>> {
    try {
      const response = await this.api.read('/api/atelier/suivis', {
        queryParams: { etats: [...requete.etats()], page: requete.page, size: requete.taille },
      });
      return buildPageFrom(response, toElement);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override mettreALAtelier(element: ElementEngageId): Promise<Result<void, RefusMiseALAtelier>> {
    return this.execute(this.api.write('/api/atelier/suivis', { body: { element: element.value } }), refusMiseALAtelier);
  }

  override cloturer(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>> {
    return this.execute(
      this.api.update('/api/atelier/suivis/{id}/cloture', { pathParams: { id: suivi.value }, body: {} }),
      refusSurLeSuivi,
    );
  }

  override rouvrir(suivi: SuiviId): Promise<Result<void, SuiviIntrouvable>> {
    return this.execute(this.api.delete('/api/atelier/suivis/{id}/cloture', { pathParams: { id: suivi.value } }), refusSurLeSuivi);
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
