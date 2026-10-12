import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationElement } from './CommandeCreationElement';
import { CommandeModificationElement } from './CommandeModificationElement';
import { ProduitDansSonCycle } from './ProduitDansSonCycle';
import { RefusCreationElement } from './RefusCreationElement';
import { RefusModificationElement } from './RefusModificationElement';
import { RequeteProduits } from './RequeteProduits';

export abstract class ElementsDeFabricationPort {
  abstract produits(requete: RequeteProduits): Promise<Page<ProduitDansSonCycle>>;
  abstract creer(commande: CommandeCreationElement): Promise<Result<void, RefusCreationElement>>;
  abstract modifier(commande: CommandeModificationElement): Promise<Result<void, RefusModificationElement>>;
}
