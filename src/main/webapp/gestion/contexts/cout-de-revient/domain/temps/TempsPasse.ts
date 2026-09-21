import { DureePassee } from './DureePassee';

/**
 * Le temps passé, séparé en bon travail et en reprise de non-conformité.
 *
 * Une pièce ratée se refait sur le même élément et au même tarif, mais comptée à part : c'est ce que le
 * client veut savoir à la clôture. Le total est lu du serveur, jamais reconstitué par addition.
 */
export class TempsPasse {
  constructor(
    readonly travail: DureePassee,
    readonly nonConformite: DureePassee,
    readonly total: DureePassee,
  ) {}

  porteUneNonConformite(): boolean {
    return !this.nonConformite.estNulle();
  }
}
