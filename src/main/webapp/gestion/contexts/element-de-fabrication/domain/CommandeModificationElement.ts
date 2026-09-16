import { ElementDeFabricationId } from './ElementDeFabricationId';
import { LibelleDElement } from './LibelleDElement';
import { ReferenceDElement } from './ReferenceDElement';

export interface CommandeModificationElement {
  readonly kind: 'MODIFICATION';
  readonly id: ElementDeFabricationId;
  readonly reference: ReferenceDElement | undefined;
  readonly libelle: LibelleDElement | undefined;
}
