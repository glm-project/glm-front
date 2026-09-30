import { ActiviteReleveId } from './ActiviteReleveId';
import { CibleDePointage } from './CibleDePointage';
import { InstantDeReleve } from './InstantDeReleve';
import { PointageReleveId } from './PointageReleveId';
import { TypeDePointage } from './TypeDePointage';

export type IntentionDePointage =
  { readonly type: 'OUVERTURE' } | { readonly type: 'TRANSITION' | 'FIN'; readonly activiteVisee: ActiviteReleveId };

export interface FicheDePointage {
  readonly id: PointageReleveId;
  readonly type: TypeDePointage;
  readonly instant: InstantDeReleve;
  readonly cible: CibleDePointage;
  readonly intention: IntentionDePointage;
}

export class PointageDElement {
  readonly id: PointageReleveId;
  readonly type: TypeDePointage;
  readonly instant: InstantDeReleve;
  readonly cible: CibleDePointage;
  readonly intention: IntentionDePointage;

  constructor(fiche: FicheDePointage) {
    this.id = fiche.id;
    this.type = fiche.type;
    this.instant = fiche.instant;
    this.cible = fiche.cible;
    this.intention = fiche.intention;
  }
}
