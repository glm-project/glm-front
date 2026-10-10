import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationPoste } from './CommandeCreationPoste';
import { CommandeModificationPoste } from './CommandeModificationPoste';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';
import { RefusCreationPoste } from './RefusCreationPoste';
import { RefusModificationPoste } from './RefusModificationPoste';
import { RefusSuppressionPoste } from './RefusSuppressionPoste';
import { RequetePostes } from './RequetePostes';

export abstract class PostesPort {
  abstract referentiel(): Promise<readonly PosteDeTravail[]>;
  abstract postes(requete: RequetePostes): Promise<Page<PosteDeTravail>>;
  abstract creer(commande: CommandeCreationPoste): Promise<Result<void, RefusCreationPoste>>;
  abstract modifier(commande: CommandeModificationPoste): Promise<Result<void, RefusModificationPoste>>;
  abstract supprimer(id: PosteDeTravailId): Promise<Result<void, RefusSuppressionPoste>>;
}
