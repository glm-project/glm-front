import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { CorrectionsPort, ResultatDeCorrection } from '../../domain/correction/CorrectionsPort';
import { SaisieDeRetrait } from '../../domain/correction/SaisieDeRetrait';

const URN_ATELIER = 'urn:glm:erreur:atelier:';

const CODES_DE_JOURNEE_CHANGEE = [
  'saisie-concurrente',
  'suivi-d-atelier-introuvable',
  'activite-visee-introuvable',
  'evenement-posterieur-a-la-cloture',
] as const;

const journeeChangee = (urn: string | undefined): boolean => CODES_DE_JOURNEE_CHANGEE.some(code => `${URN_ATELIER}${code}` === urn);

@Injectable()
export class HttpCorrections extends CorrectionsPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async retirer(saisie: SaisieDeRetrait): Promise<ResultatDeCorrection> {
    try {
      await this.api.write('/api/atelier/suivis/{id}/activites/{activite}/retrait', {
        pathParams: { id: saisie.suivi.value, activite: saisie.activite.value },
        body: { id: saisie.id },
      });
      return { kind: 'ENREGISTREE' };
    } catch (failure: unknown) {
      return this.resultatDeLEchec(failure);
    }
  }

  private resultatDeLEchec(failure: unknown): ResultatDeCorrection {
    if (journeeChangee(findApiErrorIn(failure)?.urn)) {
      return { kind: 'JOURNEE_CHANGEE' };
    }
    this.errors.handleError(failure);
    throw failure;
  }
}
