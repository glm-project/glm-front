import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationElement } from './CommandeCreationElement';
import { CommandeModificationElement } from './CommandeModificationElement';
import { ElementDeFabrication } from './ElementDeFabrication';
import { ReferenceDejaUtilisee } from './ReferenceDejaUtilisee';
import { RefusModificationElement } from './RefusModificationElement';
import { RequeteElements } from './RequeteElements';

export abstract class ElementsDeFabricationPort {
  abstract elements(requete: RequeteElements): Promise<Page<ElementDeFabrication>>;
  abstract creer(commande: CommandeCreationElement): Promise<Result<void, ReferenceDejaUtilisee>>;
  abstract modifier(commande: CommandeModificationElement): Promise<Result<void, RefusModificationElement>>;
}
