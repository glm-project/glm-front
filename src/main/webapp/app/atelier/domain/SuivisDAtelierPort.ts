import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { EtatDAtelier } from './EtatDAtelier';
import { SuiviDAtelier } from './SuiviDAtelier';
import { TypeDePointage } from './TypeDePointage';

export interface Pointage {
  operateurId: string;
  type: TypeDePointage;
  posteId?: string;
}

export abstract class SuivisDAtelierPort {
  abstract suivis(etats: readonly EtatDAtelier[]): Promise<Extrait<SuiviDAtelier>>;

  abstract pointer(suiviId: string, pointage: Pointage): Promise<void>;
}
