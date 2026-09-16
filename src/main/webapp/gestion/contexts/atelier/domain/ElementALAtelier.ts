import { ActeDAtelier } from './ActeDAtelier';
import { EtatALAtelier } from './EtatALAtelier';
import { NomDElementEngage } from './NomDElementEngage';
import { SuiviId } from './SuiviId';
import { TypeDElementEngage } from './TypeDElementEngage';

export interface FicheDElementALAtelier {
  readonly nom: NomDElementEngage;
  readonly type: TypeDElementEngage;
  readonly etat: EtatALAtelier;
  readonly engagement: ActeDAtelier;
  readonly cloture: ActeDAtelier | undefined;
}

export class ElementALAtelier {
  readonly nom: NomDElementEngage;
  readonly type: TypeDElementEngage;
  readonly etat: EtatALAtelier;
  readonly engagement: ActeDAtelier;
  readonly cloture: ActeDAtelier | undefined;

  constructor(
    readonly suivi: SuiviId,
    fiche: FicheDElementALAtelier,
  ) {
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
