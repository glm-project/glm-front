import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { findApiErrorIn } from '@/app/shared/api-client/infrastructure/secondary/findApiErrorIn';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { CorrectionsPort, MotifDeChangementDePoste, ResultatDeCorrection } from '../../domain/correction/CorrectionsPort';
import { SaisieDeChangementDePoste } from '../../domain/correction/SaisieDeChangementDePoste';
import { SaisieDeRetrait } from '../../domain/correction/SaisieDeRetrait';

const URN_ATELIER = 'urn:glm:erreur:atelier:';

const CODES_DE_JOURNEE_CHANGEE_DU_RETRAIT = [
  'saisie-concurrente',
  'suivi-d-atelier-introuvable',
  'activite-visee-introuvable',
  'evenement-posterieur-a-la-cloture',
] as const;

const CODES_DE_JOURNEE_CHANGEE_DU_CHANGEMENT_DE_POSTE = [
  ...CODES_DE_JOURNEE_CHANGEE_DU_RETRAIT,
  'poste-de-travail-introuvable',
  'operateur-non-habilite',
  'meme-poste',
] as const;

const MOTIFS_DU_CHANGEMENT_DE_POSTE: ReadonlyMap<string, MotifDeChangementDePoste> = new Map([
  [`${URN_ATELIER}chevauchement`, 'CHEVAUCHEMENT'],
]);

const journeeChangee = (codes: readonly string[], urn: string | undefined): boolean => codes.some(code => `${URN_ATELIER}${code}` === urn);

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
      return this.resultatDuRetraitEnEchec(failure);
    }
  }

  override async changerDePoste(saisie: SaisieDeChangementDePoste): Promise<ResultatDeCorrection<MotifDeChangementDePoste>> {
    try {
      await this.api.write('/api/atelier/suivis/{id}/activites/{activite}/poste', {
        pathParams: { id: saisie.suivi.value, activite: saisie.activite.value },
        body: { id: saisie.id, poste: saisie.poste.value },
      });
      return { kind: 'ENREGISTREE' };
    } catch (failure: unknown) {
      return this.resultatDuChangementDePosteEnEchec(failure);
    }
  }

  private resultatDuRetraitEnEchec(failure: unknown): ResultatDeCorrection {
    if (journeeChangee(CODES_DE_JOURNEE_CHANGEE_DU_RETRAIT, findApiErrorIn(failure)?.urn)) {
      return { kind: 'JOURNEE_CHANGEE' };
    }
    return this.signalee(failure);
  }

  private resultatDuChangementDePosteEnEchec(failure: unknown): ResultatDeCorrection<MotifDeChangementDePoste> {
    const urn = findApiErrorIn(failure)?.urn;
    const motif = urn === undefined ? undefined : MOTIFS_DU_CHANGEMENT_DE_POSTE.get(urn);
    if (motif !== undefined) {
      return { kind: 'REFUS', motif };
    }
    if (journeeChangee(CODES_DE_JOURNEE_CHANGEE_DU_CHANGEMENT_DE_POSTE, urn)) {
      return { kind: 'JOURNEE_CHANGEE' };
    }
    return this.signalee(failure);
  }

  private signalee(failure: unknown): never {
    this.errors.handleError(failure);
    throw failure;
  }
}
