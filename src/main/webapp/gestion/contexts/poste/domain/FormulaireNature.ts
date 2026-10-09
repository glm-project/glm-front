import { NatureDejaExistante } from './NatureDejaExistante';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { NatureGeree } from './NatureGeree';
import { memeNom, ressemble } from './RessemblanceDeNature';

export type DecisionDeSaisie =
  | { readonly type: 'invalide'; readonly erreur: string }
  | { readonly type: 'ressemblante'; readonly proche: NatureGeree }
  | { readonly type: 'prete'; readonly libelle: NatureDeTravail };

export class FormulaireNature {
  private constructor(
    readonly saisie: string,
    private readonly refus?: NatureDejaExistante,
    private readonly ressemblanceAcceptee = false,
  ) {}

  static vide(): FormulaireNature {
    return new FormulaireNature('');
  }

  static pour(libelle: NatureDeTravail): FormulaireNature {
    return new FormulaireNature(libelle.value);
  }

  avecSaisie(saisie: string): FormulaireNature {
    return new FormulaireNature(saisie);
  }

  avecRefus(refus: NatureDejaExistante): FormulaireNature {
    return new FormulaireNature(this.saisie, refus, this.ressemblanceAcceptee);
  }

  accepterRessemblance(): FormulaireNature {
    return new FormulaireNature(this.saisie, this.refus, true);
  }

  decider(natures: readonly NatureGeree[], sauf?: NatureDeTravailId): DecisionDeSaisie {
    const erreur = this.refus?.message ?? NatureDeTravail.erreur(this.saisie);
    if (erreur !== undefined) {
      return { type: 'invalide', erreur };
    }
    const autres = natures.filter(nature => nature.id.value !== sauf?.value);
    const homonyme = autres.find(nature => memeNom(nature.libelle.value, this.saisie));
    if (homonyme !== undefined) {
      return { type: 'invalide', erreur: `« ${homonyme.libelle.value} » existe déjà : choisissez-la plutôt que d'en créer une autre.` };
    }
    const proche = this.ressemblanceAcceptee ? undefined : autres.find(nature => ressemble(nature.libelle.value, this.saisie));
    if (proche !== undefined) {
      return { type: 'ressemblante', proche };
    }
    return { type: 'prete', libelle: new NatureDeTravail(this.saisie) };
  }
}
