import { Page } from '@/app/shared/pagination/domain/Page';
import { Operateur } from './Operateur';

export abstract class OperateursPort {
  abstract operateurs(): Promise<Page<Operateur>>;
}
