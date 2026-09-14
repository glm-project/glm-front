import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeEnregistrementPoste } from './CommandeEnregistrementPoste';
import { CoutHoraire } from './CoutHoraire';
import { ErreursFormulairePoste } from './ErreursFormulairePoste';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { PosteDeTravail } from './PosteDeTravail';
import { RefusEnregistrementPoste } from './RefusEnregistrementPoste';

interface SaisiePoste {
  readonly libelle: string;
  readonly nature: string;
  readonly coutHoraire: string;
}

export class FormulairePosteDeTravail {
  private constructor(
    readonly saisie: SaisiePoste,
    private readonly refus?: RefusEnregistrementPoste,
  ) {}

  static pourCreation(): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({ libelle: '', nature: '', coutHoraire: '' });
  }

  static pourModification(poste: PosteDeTravail): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({
      libelle: poste.libelle.value,
      nature: poste.nature.value,
      coutHoraire: poste.coutHoraire?.value.toString() ?? '',
    });
  }

  estValide(): boolean {
    return Object.values(this.erreurs()).every(erreur => erreur === undefined);
  }

  produireCommande(): Result<CommandeEnregistrementPoste, ErreursFormulairePoste> {
    if (!this.estValide()) {
      return err(this.erreurs());
    }
    return ok({
      libelle: new LibellePoste(this.saisie.libelle),
      nature: new NatureDeTravail(this.saisie.nature),
      coutHoraire: this.coutEstRenseigne() ? new CoutHoraire(this.coutNumerique()) : undefined,
    });
  }

  avecLibelle(libelle: string): FormulairePosteDeTravail {
    if (libelle === this.saisie.libelle) {
      return this;
    }
    return new FormulairePosteDeTravail({ ...this.saisie, libelle }, this.refus?.code === 'libelle-deja-utilise' ? undefined : this.refus);
  }

  avecNature(nature: string): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({ ...this.saisie, nature }, this.refus);
  }

  avecCoutHoraire(coutHoraire: string): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({ ...this.saisie, coutHoraire }, this.refus);
  }

  avecRefus(refus: RefusEnregistrementPoste): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail(this.saisie, refus);
  }

  erreurLibelle(): string | undefined {
    return this.refus?.code === 'libelle-deja-utilise' ? this.refus.message : LibellePoste.erreur(this.saisie.libelle);
  }

  erreurNature(): string | undefined {
    return NatureDeTravail.erreur(this.saisie.nature);
  }

  erreurCoutHoraire(): string | undefined {
    return this.coutEstRenseigne() ? CoutHoraire.erreur(this.coutNumerique()) : undefined;
  }

  erreurEnregistrement(): string | undefined {
    return this.refus?.code === 'poste-introuvable' ? this.refus.message : undefined;
  }

  private erreurs(): ErreursFormulairePoste {
    return {
      libelle: this.erreurLibelle(),
      nature: this.erreurNature(),
      coutHoraire: this.erreurCoutHoraire(),
      enregistrement: this.erreurEnregistrement(),
    };
  }

  private coutEstRenseigne(): boolean {
    return this.saisie.coutHoraire.trim() !== '';
  }

  private coutNumerique(): number {
    return Number(this.saisie.coutHoraire.replace(',', '.'));
  }
}
