import { Page } from '@/app/shared/pagination/domain/Page';
import { OperateurDeclare } from './OperateurDeclare';

export abstract class OperateursDeSupervisionPort {
  abstract read(): Promise<Page<OperateurDeclare>>;
}
