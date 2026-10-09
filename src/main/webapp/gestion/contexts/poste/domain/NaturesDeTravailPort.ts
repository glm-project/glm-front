import { Result } from '@/app/shared/result/domain/Result';
import { NatureDejaExistante } from './NatureDejaExistante';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { NatureGeree } from './NatureGeree';
import { RefusRenommageNature } from './RefusRenommageNature';
import { RefusSuppressionNature } from './RefusSuppressionNature';

export abstract class NaturesDeTravailPort {
  abstract natures(): Promise<readonly NatureGeree[]>;
  abstract enregistrer(libelle: NatureDeTravail): Promise<Result<void, NatureDejaExistante>>;
  abstract renommer(id: NatureDeTravailId, libelle: NatureDeTravail): Promise<Result<void, RefusRenommageNature>>;
  abstract supprimer(id: NatureDeTravailId): Promise<Result<void, RefusSuppressionNature>>;
}
