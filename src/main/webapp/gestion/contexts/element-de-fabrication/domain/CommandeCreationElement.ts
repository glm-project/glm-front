import { LibelleDElement } from './LibelleDElement';
import { ReferenceDElement } from './ReferenceDElement';
import { TypeDElementDeFabrication } from './TypeDElementDeFabrication';

export interface CommandeCreationElement {
  readonly kind: 'CREATION';
  readonly type: TypeDElementDeFabrication;
  readonly reference: ReferenceDElement | undefined;
  readonly libelle: LibelleDElement | undefined;
}
