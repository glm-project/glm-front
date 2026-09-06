import { Page } from '@/app/shared/pagination/domain/Page';
import { IdentiteDuGeste } from '../journal/LocalPupitreState';
import { EtatDAtelier } from './EtatDAtelier';
import { SuiviDAtelier } from './SuiviDAtelier';
import { TypeDePointage } from './TypeDePointage';

export interface Pointage extends IdentiteDuGeste {
  operateurId: string;
  type: TypeDePointage;
  posteId?: string;
}

export abstract class SuivisDAtelierPort {
  abstract suivis(etats: readonly EtatDAtelier[]): Promise<Page<SuiviDAtelier>>;

  abstract recordPointage(suiviId: string, pointage: Pointage): Promise<void>;
}
