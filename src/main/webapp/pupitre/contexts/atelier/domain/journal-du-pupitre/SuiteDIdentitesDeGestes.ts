import { IdentiteDuGeste } from './JournalDuPupitre';

const LONGUEUR_DU_SUFFIXE = 8;
const BASE_HEXADECIMALE = 16;

export class SuiteDIdentitesDeGestes {
  private constructor(
    private readonly prefixe: string,
    private readonly suffixe: number,
    private readonly dateDeSurvenue: string,
  ) {}

  static from(racine: IdentiteDuGeste): SuiteDIdentitesDeGestes {
    return new SuiteDIdentitesDeGestes(
      racine.id.slice(0, -LONGUEUR_DU_SUFFIXE),
      Number.parseInt(racine.id.slice(-LONGUEUR_DU_SUFFIXE), BASE_HEXADECIMALE),
      racine.dateDeSurvenue,
    );
  }

  identite(): IdentiteDuGeste {
    return {
      id: `${this.prefixe}${this.suffixe.toString(BASE_HEXADECIMALE).padStart(LONGUEUR_DU_SUFFIXE, '0')}`,
      dateDeSurvenue: this.dateDeSurvenue,
    };
  }

  suivante(): SuiteDIdentitesDeGestes {
    return new SuiteDIdentitesDeGestes(this.prefixe, (this.suffixe + 1) >>> 0, this.dateDeSurvenue);
  }
}
