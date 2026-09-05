import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { EtatDAtelier } from './EtatDAtelier';
import { IdentiteDuGeste } from './PupitreLocal';
import { SuiviDAtelier } from './SuiviDAtelier';
import { TypeDePointage } from './TypeDePointage';

export interface Pointage extends IdentiteDuGeste {
  operateurId: string;
  type: TypeDePointage;
  posteId?: string;
}

export abstract class SuivisDAtelierPort {
  abstract suivis(etats: readonly EtatDAtelier[]): Promise<Extrait<SuiviDAtelier>>;

  abstract recordPointage(suiviId: string, pointage: Pointage): Promise<void>;
}
