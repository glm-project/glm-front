import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { PeriodeDuRapport } from '../../domain/rapport/PeriodeDuRapport';
import { RapportDActivitePort } from '../../domain/rapport/RapportDActivitePort';
import { ResumeDuRapport } from '../../domain/rapport/ResumeDuRapport';
import { OperateurReleveId } from '../../domain/releve/OperateurReleveId';

type RestResume = components['schemas']['RestResumeDuRapportDActivite'];

const ROUTE_RESUME = '/api/syntheses-des-heures/{operateurId}/rapport';

interface ParametresDePeriode {
  readonly annee: number;
  readonly semaine?: number;
  readonly mois?: number;
}

const parametresDe = (periode: PeriodeDuRapport): ParametresDePeriode =>
  periode.borne.genre === 'SEMAINE'
    ? { annee: periode.borne.semaine.annee, semaine: periode.borne.semaine.numero }
    : { annee: periode.borne.mois.annee, mois: periode.borne.mois.mois };

const porteLaPeriode = (lu: RestResume, periode: PeriodeDuRapport): boolean =>
  lu.premierJour === periode.premierJour().value && lu.dernierJour === periode.dernierJour().value;

const toResume = (lu: RestResume, periode: PeriodeDuRapport): ResumeDuRapport => {
  if (!porteLaPeriode(lu, periode)) {
    throw new Error('Le résumé reçu du serveur ne porte pas la période demandée.');
  }
  return new ResumeDuRapport({
    tempsPointe: new DureeTravaillee(lu.tempsPointe.valeur),
    joursAvecPointage: lu.joursAvecPointage,
    finsAutomatiques: lu.finsAutomatiques,
  });
};

@Injectable()
export class HttpRapportDActivite extends RapportDActivitePort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async resume(operateur: OperateurReleveId, periode: PeriodeDuRapport): Promise<ResumeDuRapport> {
    try {
      const lu = await this.api.read(ROUTE_RESUME, { pathParams: { operateurId: operateur.value }, queryParams: parametresDe(periode) });
      return toResume(lu, periode);
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
