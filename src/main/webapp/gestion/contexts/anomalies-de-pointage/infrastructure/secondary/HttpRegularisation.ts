import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import {
  CodeRefusRegularisation,
  CODES_REFUS_REGULARISATION,
  CommandeDeRegularisation,
  RegularisationPort,
  ResultatDeRegularisation,
} from '../../domain/regularisation/RegularisationPort';

const URN_ATELIER = 'urn:glm:erreur:atelier:';
const URN_SAISIE_CONCURRENTE = `${URN_ATELIER}saisie-concurrente`;

const refusDe = (urn: string | undefined): CodeRefusRegularisation | undefined =>
  CODES_REFUS_REGULARISATION.find(code => `${URN_ATELIER}${code}` === urn);

@Injectable()
export class HttpRegularisation extends RegularisationPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async regulariser(commande: CommandeDeRegularisation): Promise<ResultatDeRegularisation> {
    try {
      await this.api.write('/api/atelier/suivis/{id}/regularisations', {
        pathParams: { id: commande.suivi.suivi },
        body: { id: commande.id, activite: commande.activite.activite, dateDeSurvenue: commande.dateDeSurvenue },
      });
      return { kind: 'REGULARISEE' };
    } catch (failure: unknown) {
      return this.resultatDuRefus(failure);
    }
  }

  private resultatDuRefus(failure: unknown): ResultatDeRegularisation {
    const urn = findApiErrorIn(failure)?.urn;
    if (urn === URN_SAISIE_CONCURRENTE) return { kind: 'CONCURRENCE' };
    const code = refusDe(urn);
    if (code !== undefined) return { kind: 'REFUS', code };
    this.errors.handleError(failure);
    throw failure;
  }
}
