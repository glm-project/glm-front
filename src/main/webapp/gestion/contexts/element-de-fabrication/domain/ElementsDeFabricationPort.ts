import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationElement } from './CommandeCreationElement';
import { CommandeModificationElement } from './CommandeModificationElement';
import { ElementDeFabrication } from './ElementDeFabrication';
import { ReferentielDesProduits } from './ReferentielDesProduits';
import { RefusCreationElement } from './RefusCreationElement';
import { RefusModificationElement } from './RefusModificationElement';
import { RequeteElements } from './RequeteElements';

export abstract class ElementsDeFabricationPort {
  abstract referentiel(): Promise<ReferentielDesProduits>;
  abstract elements(requete: RequeteElements): Promise<Page<ElementDeFabrication>>;
  abstract creer(commande: CommandeCreationElement): Promise<Result<void, RefusCreationElement>>;
  abstract modifier(commande: CommandeModificationElement): Promise<Result<void, RefusModificationElement>>;
}
