import { ActeDAtelier } from './ActeDAtelier';
import { CategorieDElementEngage } from './CategorieDElementEngage';
import { ElementEngageId } from './ElementEngageId';
import { EtatALAtelier } from './EtatALAtelier';
import { NomDElementEngage } from './NomDElementEngage';
import { SuiviId } from './SuiviId';

export interface FicheDElementALAtelier {
  readonly element: ElementEngageId;
  readonly nom: NomDElementEngage;
  readonly categorie: CategorieDElementEngage;
  readonly etat: EtatALAtelier;
  readonly engagement: ActeDAtelier;
  readonly cloture: ActeDAtelier | undefined;
}

export class ElementALAtelier {
  readonly element: ElementEngageId;
  readonly nom: NomDElementEngage;
  readonly categorie: CategorieDElementEngage;
  readonly etat: EtatALAtelier;
  readonly engagement: ActeDAtelier;
  readonly cloture: ActeDAtelier | undefined;

  constructor(
    readonly suivi: SuiviId,
    fiche: FicheDElementALAtelier,
  ) {
    this.element = fiche.element;
    this.nom = fiche.nom;
    this.categorie = fiche.categorie;
    this.etat = fiche.etat;
    this.engagement = fiche.engagement;
    this.cloture = fiche.cloture;
  }

  estCloture(): boolean {
    return this.etat === 'CLOTURE';
  }
}
