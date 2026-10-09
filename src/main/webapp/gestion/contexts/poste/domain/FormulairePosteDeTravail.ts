import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationPoste } from './CommandeCreationPoste';
import { CommandeModificationPoste } from './CommandeModificationPoste';
import { CoutHoraire } from './CoutHoraire';
import { ErreursFormulairePoste } from './ErreursFormulairePoste';
import { LibellePoste } from './LibellePoste';
import { NatureChoisie } from './NatureChoisie';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';
import { RefusModificationPoste } from './RefusModificationPoste';

interface SaisiePoste {
  readonly libelle: string;
  readonly nature: string;
  readonly coutHoraire: string;
}

export type CommandePoste = CommandeCreationPoste | CommandeModificationPoste;

interface EtatFormulairePoste {
  readonly saisie: SaisiePoste;
  readonly id: PosteDeTravailId | undefined;
  readonly refus: RefusModificationPoste | undefined;
  readonly natureChoisie: NatureChoisie | undefined;
}

export class FormulairePosteDeTravail {
  readonly saisie: SaisiePoste;
  readonly id: PosteDeTravailId | undefined;
  private readonly refus: RefusModificationPoste | undefined;
  private readonly natureChoisie: NatureChoisie | undefined;

  private constructor(etat: EtatFormulairePoste) {
    this.saisie = etat.saisie;
    this.id = etat.id;
    this.refus = etat.refus;
    this.natureChoisie = etat.natureChoisie;
  }

  static pourCreation(nature?: NatureChoisie): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({
      saisie: { libelle: '', nature: nature?.libelle.value ?? '', coutHoraire: '' },
      id: undefined,
      refus: undefined,
      natureChoisie: nature,
    });
  }

  static pourModification(poste: PosteDeTravail): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({
      saisie: {
        libelle: poste.libelle.value,
        nature: poste.nature.value,
        coutHoraire: poste.coutHoraire?.value.toString() ?? '',
      },
      id: poste.id,
      refus: undefined,
      natureChoisie: { id: poste.natureId, libelle: poste.nature },
    });
  }

  estValide(): boolean {
    return Object.values(this.erreurs()).every(erreur => erreur === undefined);
  }

  produireCommande(): Result<CommandePoste, ErreursFormulairePoste> {
    const choisie = this.natureChoisie;
    if (choisie === undefined) {
      return err(this.erreurs());
    }
    if (!this.estValide()) {
      return err(this.erreurs());
    }
    const libelle = new LibellePoste(this.saisie.libelle);
    const { id: natureId, libelle: nature } = choisie;
    const coutHoraire = this.coutEstRenseigne() ? new CoutHoraire(this.coutNumerique()) : undefined;

    if (this.id === undefined) {
      return ok({ type: 'CREATION', libelle, nature, natureId, coutHoraire });
    }
    return ok({ type: 'MODIFICATION', id: this.id, libelle, nature, natureId, coutHoraire });
  }

  avecLibelle(libelle: string): FormulairePosteDeTravail {
    return this.avec({
      saisie: { ...this.saisie, libelle },
      refus: libelle !== this.saisie.libelle && this.refus?.code === 'libelle-deja-utilise' ? undefined : this.refus,
    });
  }

  avecNature(nature: string): FormulairePosteDeTravail {
    const choisie = nature === this.natureChoisie?.libelle.value ? this.natureChoisie : undefined;
    return this.avec({ saisie: { ...this.saisie, nature }, natureChoisie: choisie });
  }

  choisirNature(nature: NatureChoisie): FormulairePosteDeTravail {
    return this.avec({
      saisie: { ...this.saisie, nature: nature.libelle.value },
      natureChoisie: nature,
      refus: this.refus?.code === 'nature-inconnue' ? undefined : this.refus,
    });
  }

  avecCoutHoraire(coutHoraire: string): FormulairePosteDeTravail {
    return this.avec({ saisie: { ...this.saisie, coutHoraire } });
  }

  avecRefus(refus: RefusModificationPoste): FormulairePosteDeTravail {
    return this.avec({ refus });
  }

  erreurLibelle(): string | undefined {
    return this.refus?.code === 'libelle-deja-utilise' ? this.refus.message : LibellePoste.erreur(this.saisie.libelle);
  }

  erreurNature(): string | undefined {
    if (this.refus?.code === 'nature-inconnue') {
      return this.refus.message;
    }
    return this.natureChoisie === undefined ? 'Choisissez une nature dans la liste.' : undefined;
  }

  erreurCoutHoraire(): string | undefined {
    return this.coutEstRenseigne() ? CoutHoraire.erreur(this.coutNumerique()) : undefined;
  }

  erreurEnregistrement(): string | undefined {
    return this.refus?.code === 'poste-introuvable' ? this.refus.message : undefined;
  }

  private avec(changement: Partial<EtatFormulairePoste>): FormulairePosteDeTravail {
    return new FormulairePosteDeTravail({
      saisie: this.saisie,
      id: this.id,
      refus: this.refus,
      natureChoisie: this.natureChoisie,
      ...changement,
    });
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
