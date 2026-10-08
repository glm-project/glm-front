import { CategorieDeProduit } from './CategorieDeProduit';
import { LibelleDElement } from './LibelleDElement';
import { ReferenceDElement } from './ReferenceDElement';

export interface CommandeCreationElement {
  readonly kind: 'CREATION';
  readonly categorie: CategorieDeProduit;
  readonly reference: ReferenceDElement | undefined;
  readonly libelle: LibelleDElement | undefined;
}
