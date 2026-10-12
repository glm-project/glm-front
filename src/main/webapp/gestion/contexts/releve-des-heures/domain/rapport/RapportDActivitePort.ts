import { OperateurReleveId } from '../releve/OperateurReleveId';
import { PeriodeDuRapport } from './PeriodeDuRapport';
import { ResumeDuRapport } from './ResumeDuRapport';

export abstract class RapportDActivitePort {
  abstract resume(operateur: OperateurReleveId, periode: PeriodeDuRapport): Promise<ResumeDuRapport>;
}
