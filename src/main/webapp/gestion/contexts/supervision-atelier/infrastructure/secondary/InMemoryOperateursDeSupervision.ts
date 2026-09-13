import { Page } from '@/app/shared/pagination/domain/Page';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { OperateursDeSupervisionPort } from '../../domain/OperateursDeSupervisionPort';

export class InMemoryOperateursDeSupervision extends OperateursDeSupervisionPort {
  private readonly page: Page<OperateurDeclare> | Error;

  constructor(page: Page<OperateurDeclare> | Error) {
    super();
    this.page = page instanceof Error ? page : new Page([...page.elements], page.totalCount);
  }

  read(): Promise<Page<OperateurDeclare>> {
    return this.page instanceof Error ? Promise.reject(this.page) : Promise.resolve(this.page);
  }
}
