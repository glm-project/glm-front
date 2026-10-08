import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CategorieDejaExistante } from './CategorieDejaExistante';
import { CategorieDeProduit } from './CategorieDeProduit';

export class FormulaireCategorieDeProduit {
  private constructor(
    readonly saisie: string,
    private readonly refus?: CategorieDejaExistante,
  ) {}

  get code(): string {
    return this.saisie.toLocaleUpperCase('fr-FR');
  }

  static vide(): FormulaireCategorieDeProduit {
    return new FormulaireCategorieDeProduit('');
  }

  avecCode(saisie: string): FormulaireCategorieDeProduit {
    const suivant = new FormulaireCategorieDeProduit(saisie);
    return suivant.code === this.code ? new FormulaireCategorieDeProduit(saisie, this.refus) : suivant;
  }

  avecRefus(refus: CategorieDejaExistante): FormulaireCategorieDeProduit {
    return new FormulaireCategorieDeProduit(this.saisie, refus);
  }

  erreurCode(): string | undefined {
    return this.refus?.message ?? CategorieDeProduit.erreur(this.code);
  }

  produireCategorie(): Result<CategorieDeProduit, string> {
    const erreur = this.erreurCode();
    return erreur === undefined ? ok(new CategorieDeProduit(this.code)) : err(erreur);
  }
}
