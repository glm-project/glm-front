import { components } from '@/app/generated/schema';
import { ApiClient, DownloadedFile } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { FichierExporte } from '@/gestion/shared/enregistrement-de-fichier/domain/FichierExporte';
import { inject, Injectable } from '@angular/core';
import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { FormatDuRapport } from '../../domain/rapport/FormatDuRapport';
import { PeriodeDuRapport } from '../../domain/rapport/PeriodeDuRapport';
import { RapportDActivitePort } from '../../domain/rapport/RapportDActivitePort';
import { ResumeDuRapport } from '../../domain/rapport/ResumeDuRapport';
import { OperateurReleveId } from '../../domain/releve/OperateurReleveId';

type RestResume = components['schemas']['RestResumeDuRapportDActivite'];

const ROUTE_RESUME = '/api/syntheses-des-heures/{operateurId}/rapport';
const ROUTE_EXCEL = '/api/syntheses-des-heures/{operateurId}/export.xlsx';

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

  override async exporte(operateur: OperateurReleveId, periode: PeriodeDuRapport, format: FormatDuRapport): Promise<FichierExporte> {
    try {
      const fichier = await this.telecharge(operateur, periode, format);
      return { nom: required(fichier.filename, 'Content-Disposition.filename'), contenu: fichier.content };
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  private telecharge(operateur: OperateurReleveId, periode: PeriodeDuRapport, format: FormatDuRapport): Promise<DownloadedFile> {
    const requete = { pathParams: { operateurId: operateur.value }, queryParams: parametresDe(periode) };
    const telechargements: Record<FormatDuRapport, () => Promise<DownloadedFile>> = {
      EXCEL: () => this.api.download(ROUTE_EXCEL, requete),
    };
    return telechargements[format]();
  }
}
