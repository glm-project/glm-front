import { Result } from '@/app/shared/result/domain/Result';
import { CategorieDejaExistante } from './CategorieDejaExistante';
import { CategorieDeProduit } from './CategorieDeProduit';
import { OrdreDesCategories } from './OrdreDesCategories';
import { OrdreIncomplet } from './OrdreIncomplet';

export abstract class CategoriesDeProduitPort {
  abstract categories(): Promise<readonly CategorieDeProduit[]>;
  abstract declarer(categorie: CategorieDeProduit): Promise<Result<void, CategorieDejaExistante>>;
  abstract reordonner(ordre: OrdreDesCategories): Promise<Result<void, OrdreIncomplet>>;
}
