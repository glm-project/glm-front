import { Result } from '@/app/shared/result/domain/Result';
import { CategorieDejaExistante } from './CategorieDejaExistante';
import { CategorieDeProduit } from './CategorieDeProduit';

export abstract class CategoriesDeProduitPort {
  abstract categories(): Promise<readonly CategorieDeProduit[]>;
  abstract declarer(categorie: CategorieDeProduit): Promise<Result<void, CategorieDejaExistante>>;
}
