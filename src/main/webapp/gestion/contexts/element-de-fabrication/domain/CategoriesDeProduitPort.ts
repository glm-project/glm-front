import { Result } from '@/app/shared/result/domain/Result';
import { CategorieDejaExistante } from './CategorieDejaExistante';
import { CategorieDeProduit } from './CategorieDeProduit';
import { CategorieGeree } from './CategorieGeree';
import { OrdreDesCategories } from './OrdreDesCategories';
import { OrdreIncomplet } from './OrdreIncomplet';
import { RefusSuppressionCategorie } from './RefusSuppressionCategorie';

export abstract class CategoriesDeProduitPort {
  abstract categories(): Promise<readonly CategorieGeree[]>;
  abstract declarer(categorie: CategorieDeProduit): Promise<Result<void, CategorieDejaExistante>>;
  abstract reordonner(ordre: OrdreDesCategories): Promise<Result<void, OrdreIncomplet>>;
  abstract supprimer(categorie: CategorieDeProduit): Promise<Result<void, RefusSuppressionCategorie>>;
}
