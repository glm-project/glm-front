import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationOperateur } from './CommandeCreationOperateur';
import { CommandeModificationOperateur } from './CommandeModificationOperateur';
import { Operateur } from './Operateur';
import { OperateurId } from './OperateurId';
import { PosteHabilitable } from './PosteHabilitable';
import { RefusCreationOperateur } from './RefusCreationOperateur';
import { RefusModificationOperateur } from './RefusModificationOperateur';
import { RefusSuppressionOperateur } from './RefusSuppressionOperateur';
import { RequeteOperateurs } from './RequeteOperateurs';

export abstract class OperateursPort {
  abstract operateurs(requete: RequeteOperateurs): Promise<Page<Operateur>>;
  abstract postesHabilitables(): Promise<readonly PosteHabilitable[]>;
  abstract creer(commande: CommandeCreationOperateur): Promise<Result<void, RefusCreationOperateur>>;
  abstract modifier(commande: CommandeModificationOperateur): Promise<Result<void, RefusModificationOperateur>>;
  abstract supprimer(id: OperateurId): Promise<Result<void, RefusSuppressionOperateur>>;
}
