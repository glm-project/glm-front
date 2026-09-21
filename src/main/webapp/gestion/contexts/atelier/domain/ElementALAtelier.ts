import { ActeDAtelier } from './ActeDAtelier';
import { ElementEngageId } from './ElementEngageId';
import { EtatALAtelier } from './EtatALAtelier';
import { NomDElementEngage } from './NomDElementEngage';
import { SuiviId } from './SuiviId';
import { TypeDElementEngage } from './TypeDElementEngage';

export interface FicheDElementALAtelier {
  readonly element: ElementEngageId;
  readonly nom: NomDElementEngage;
  readonly type: TypeDElementEngage;
  readonly etat: EtatALAtelier;
  readonly engagement: ActeDAtelier;
  readonly cloture: ActeDAtelier | undefined;
}

export class ElementALAtelier {
  /** L'élément engagé, que le coût de revient adresse. Le suivi, lui, reste la seule adresse de l'atelier. */
  readonly element: ElementEngageId;
  readonly nom: NomDElementEngage;
  readonly type: TypeDElementEngage;
  readonly etat: EtatALAtelier;
  readonly engagement: ActeDAtelier;
  readonly cloture: ActeDAtelier | undefined;

  constructor(
    readonly suivi: SuiviId,
    fiche: FicheDElementALAtelier,
  ) {
    this.element = fiche.element;
    this.nom = fiche.nom;
    this.type = fiche.type;
    this.etat = fiche.etat;
    this.engagement = fiche.engagement;
    this.cloture = fiche.cloture;
  }

  estCloture(): boolean {
    return this.etat === 'CLOTURE';
  }
}
