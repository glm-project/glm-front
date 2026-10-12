import { RefusDActeDAtelier } from './RefusDActeDAtelier';

export class ProduitIntrouvable extends RefusDActeDAtelier {
  readonly code = 'produit-introuvable';
  readonly message = 'Ce produit n’existe plus. Actualisez la liste.';
}
