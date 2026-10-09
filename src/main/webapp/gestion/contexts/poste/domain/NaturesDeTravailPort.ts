import { Result } from '@/app/shared/result/domain/Result';
import { NatureDejaExistante } from './NatureDejaExistante';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureGeree } from './NatureGeree';

export abstract class NaturesDeTravailPort {
  abstract natures(): Promise<readonly NatureGeree[]>;
  abstract enregistrer(libelle: NatureDeTravail): Promise<Result<void, NatureDejaExistante>>;
}
