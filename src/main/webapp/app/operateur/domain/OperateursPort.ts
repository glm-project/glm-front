import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { Operateur } from './Operateur';

export abstract class OperateursPort {
  abstract operateurs(): Promise<Extrait<Operateur>>;
}
