import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { CommandeEnregistrementPoste } from './CommandeEnregistrementPoste';
import { NatureDeTravail } from './NatureDeTravail';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';
import { RefusEnregistrementPoste } from './RefusEnregistrementPoste';
import { RefusSuppressionPoste } from './RefusSuppressionPoste';

export abstract class PostesPort {
  abstract postes(page: number, taille: number): Promise<Page<PosteDeTravail>>;
  abstract natures(): Promise<readonly NatureDeTravail[]>;
  abstract creer(commande: CommandeEnregistrementPoste): Promise<Result<void, RefusEnregistrementPoste>>;
  abstract modifier(id: PosteDeTravailId, commande: CommandeEnregistrementPoste): Promise<Result<void, RefusEnregistrementPoste>>;
  abstract supprimer(id: PosteDeTravailId): Promise<Result<void, RefusSuppressionPoste>>;
}
