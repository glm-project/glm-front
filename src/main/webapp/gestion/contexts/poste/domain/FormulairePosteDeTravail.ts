import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationPoste } from './CommandeCreationPoste';
import { CommandeModificationPoste } from './CommandeModificationPoste';
import { CoutHoraire } from './CoutHoraire';
import { ErreursFormulairePoste } from './ErreursFormulairePoste';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';
import { RefusModificationPoste } from './RefusModificationPoste';

interface SaisiePoste {
  readonly libelle: string;
  readonly nature: string;
  readonly coutHoraire: string;
}

export type CommandePoste = CommandeCreationPoste | CommandeModificationPoste;

export class FormulairePosteDeTravail {
  private constructor(
    readonly saisie: SaisiePoste,
    readonly id?: PosteDeTravailId,
    private readonly refus?: RefusModificationPoste,
  ) {}

  static pourCreation(): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({ libelle: '', nature: '', coutHoraire: '' });
  }

  static pourModification(poste: PosteDeTravail): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail(
      {
        libelle: poste.libelle.value,
        nature: poste.nature.value,
        coutHoraire: poste.coutHoraire?.value.toString() ?? '',
      },
      poste.id,
    );
  }

  estValide(): boolean {
    return Object.values(this.erreurs()).every(erreur => erreur === undefined);
  }

  produireCommande(): Result<CommandePoste, ErreursFormulairePoste> {
    if (!this.estValide()) {
      return err(this.erreurs());
    }
    const libelle = new LibellePoste(this.saisie.libelle);
    const nature = new NatureDeTravail(this.saisie.nature);
    const coutHoraire = this.coutEstRenseigne() ? new CoutHoraire(this.coutNumerique()) : undefined;

    if (this.id === undefined) {
      return ok({ type: 'CREATION', libelle, nature, coutHoraire });
    }
    return ok({ type: 'MODIFICATION', id: this.id, libelle, nature, coutHoraire });
  }

  avecLibelle(libelle: string): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail(
      { ...this.saisie, libelle },
      this.id,
      libelle !== this.saisie.libelle && this.refus?.code === 'libelle-deja-utilise' ? undefined : this.refus,
    );
  }

  avecNature(nature: string): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({ ...this.saisie, nature }, this.id, this.refus);
  }

  avecCoutHoraire(coutHoraire: string): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({ ...this.saisie, coutHoraire }, this.id, this.refus);
  }

  avecRefus(refus: RefusModificationPoste): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail(this.saisie, this.id, refus);
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
