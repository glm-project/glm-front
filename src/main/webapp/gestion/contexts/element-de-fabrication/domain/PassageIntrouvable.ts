import { RefusDActeDAtelier } from './RefusDActeDAtelier';

export class PassageIntrouvable extends RefusDActeDAtelier {
  readonly code = 'passage-introuvable';
  readonly message = 'Ce produit n’est plus à l’atelier. Actualisez la liste.';
}
