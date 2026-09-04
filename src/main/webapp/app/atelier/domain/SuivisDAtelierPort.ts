import { Extrait } from '@/app/shared/pagination/domain/Extrait';
import { EtatDAtelier } from './EtatDAtelier';
import { SuiviDAtelier } from './SuiviDAtelier';

export abstract class SuivisDAtelierPort {
  abstract suivis(etats: readonly EtatDAtelier[]): Promise<Extrait<SuiviDAtelier>>;
}
