import { RefusDActeDAtelier } from './RefusDActeDAtelier';

export class ProduitDejaALAtelier extends RefusDActeDAtelier {
  readonly code = 'produit-deja-a-l-atelier';
  readonly message = 'Ce produit est déjà passé à l’atelier. Actualisez la liste.';
}
