import { ElementDeFabrication } from './ElementDeFabrication';
import { EtatDAtelier } from './EtatDAtelier';
import { SuiviDuProduitId } from './SuiviDuProduitId';

export type PassageALAtelier =
  | { readonly cycle: 'EN_PREPARATION' }
  | { readonly cycle: 'EN_ATELIER'; readonly suivi: SuiviDuProduitId; readonly etat: EtatDAtelier; readonly misALAtelierLe: Date }
  | {
      readonly cycle: 'CLOTURE';
      readonly suivi: SuiviDuProduitId;
      readonly misALAtelierLe: Date;
      readonly clotureLe: Date;
      readonly clotureePar: string;
    };

export class ProduitDansSonCycle {
  constructor(
    readonly element: ElementDeFabrication,
    readonly creeLe: Date,
    readonly passage: PassageALAtelier,
  ) {}
}
