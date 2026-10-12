import { FichierExporte } from '@/gestion/shared/enregistrement-de-fichier/domain/FichierExporte';
import { OperateurReleveId } from '../releve/OperateurReleveId';
import { FormatDuRapport } from './FormatDuRapport';
import { PeriodeDuRapport } from './PeriodeDuRapport';
import { ResumeDuRapport } from './ResumeDuRapport';

export abstract class RapportDActivitePort {
  abstract resume(operateur: OperateurReleveId, periode: PeriodeDuRapport): Promise<ResumeDuRapport>;

  abstract exporte(operateur: OperateurReleveId, periode: PeriodeDuRapport, format: FormatDuRapport): Promise<FichierExporte>;
}
