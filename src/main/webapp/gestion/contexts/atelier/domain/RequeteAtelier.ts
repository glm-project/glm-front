import { EtatALAtelier } from './EtatALAtelier';
import { FiltreDAtelier } from './FiltreDAtelier';
import { verifieLaPagination } from './InvariantsDePage';

const ETATS: Record<FiltreDAtelier, readonly EtatALAtelier[]> = {
  ACTIFS: ['EN_ATTENTE', 'EN_COURS', 'INTERROMPU'],
  CLOTURES: ['CLOTURE'],
};

export class RequeteAtelier {
  constructor(
    readonly page: number,
    readonly taille: number,
    readonly filtre: FiltreDAtelier,
  ) {
    verifieLaPagination(page, taille);
  }

  etats(): readonly EtatALAtelier[] {
    return ETATS[this.filtre];
  }
}
