import { FormatDuRapport } from '@/gestion/contexts/releve-des-heures/domain/rapport/FormatDuRapport';
import { PeriodeDuRapport } from '@/gestion/contexts/releve-des-heures/domain/rapport/PeriodeDuRapport';
import { RapportDActivitePort } from '@/gestion/contexts/releve-des-heures/domain/rapport/RapportDActivitePort';
import { ResumeDuRapport } from '@/gestion/contexts/releve-des-heures/domain/rapport/ResumeDuRapport';
import { OperateurReleveId } from '@/gestion/contexts/releve-des-heures/domain/releve/OperateurReleveId';
import { FichierExporte } from '@/gestion/shared/enregistrement-de-fichier/domain/FichierExporte';

export interface DemandeDExport {
  readonly operateur: OperateurReleveId;
  readonly periode: PeriodeDuRapport;
  readonly format: FormatDuRapport;
}

export interface DemandeDeResume {
  readonly operateur: OperateurReleveId;
  readonly periode: PeriodeDuRapport;
}

const cleDe = (operateur: OperateurReleveId, periode: PeriodeDuRapport): string =>
  `${operateur.value}|${periode.premierJour().value}|${periode.dernierJour().value}`;

const auTourSuivant = <T>(valeur: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(valeur)));

export class RapportDActiviteFixture extends RapportDActivitePort {
  static readonly port = RapportDActivitePort;
  readonly demandes: DemandeDeResume[] = [];
  private readonly resumes = new Map<string, ResumeDuRapport>();
  echec: Error | undefined;
  readonly exports: DemandeDExport[] = [];
  echecDExport: Error | undefined;
  exportDiffere: Promise<FichierExporte> | undefined;

  seme(operateur: OperateurReleveId, periode: PeriodeDuRapport, resume: ResumeDuRapport): void {
    this.resumes.set(cleDe(operateur, periode), resume);
  }

  override resume(operateur: OperateurReleveId, periode: PeriodeDuRapport): Promise<ResumeDuRapport> {
    this.demandes.push({ operateur, periode });
    const resume = this.resumes.get(cleDe(operateur, periode));
    if (this.echec !== undefined) {
      return Promise.reject(this.echec);
    }
    if (resume === undefined) {
      return Promise.reject(new Error(`Aucun résumé semé pour ${cleDe(operateur, periode)}`));
    }
    return auTourSuivant(resume);
  }

  override exporte(operateur: OperateurReleveId, periode: PeriodeDuRapport, format: FormatDuRapport): Promise<FichierExporte> {
    this.exports.push({ operateur, periode, format });
    if (this.echecDExport !== undefined) {
      return Promise.reject(this.echecDExport);
    }
    return this.exportDiffere ?? auTourSuivant({ nom: `rapport-${periode.premierJour().value}.xlsx`, contenu: new Blob(['classeur']) });
  }
}
