import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CategorieDeProduit } from './CategorieDeProduit';
import { CommandeCreationElement } from './CommandeCreationElement';
import { CommandeModificationElement } from './CommandeModificationElement';
import { ElementDeFabrication } from './ElementDeFabrication';
import { ElementDeFabricationId } from './ElementDeFabricationId';
import { ErreursFormulaireElement } from './ErreursFormulaireElement';
import { LibelleDElement } from './LibelleDElement';
import { ReferenceDElement } from './ReferenceDElement';
import { RefusCreationElement } from './RefusCreationElement';
import { RefusModificationElement } from './RefusModificationElement';

interface SaisieElement {
  readonly reference: string;
  readonly libelle: string;
}

interface EtatFormulaireElement {
  readonly choix: readonly CategorieDeProduit[];
  readonly categorie: CategorieDeProduit | undefined;
  readonly saisie: SaisieElement;
  readonly id: ElementDeFabricationId | undefined;
  readonly refus: RefusDeCommande | undefined;
}

export type CommandeElement = CommandeCreationElement | CommandeModificationElement;

export type RefusDeCommande = RefusCreationElement | RefusModificationElement;

const SAISIE_VIDE: SaisieElement = { reference: '', libelle: '' };

const CATEGORIE_A_CHOISIR = 'Choisissez la catégorie du produit.';

export class FormulaireElementDeFabrication {
  readonly choix: readonly CategorieDeProduit[];
  readonly categorie: CategorieDeProduit | undefined;
  readonly saisie: SaisieElement;
  readonly id: ElementDeFabricationId | undefined;
  private readonly refus: RefusDeCommande | undefined;

  private constructor(etat: EtatFormulaireElement) {
    this.choix = etat.choix;
    this.categorie = etat.categorie;
    this.saisie = etat.saisie;
    this.id = etat.id;
    this.refus = etat.refus;
  }

  static pourCreation(choix: readonly CategorieDeProduit[], categorie: CategorieDeProduit | undefined): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({ choix, categorie, saisie: SAISIE_VIDE, id: undefined, refus: undefined });
  }

  static pourModification(element: ElementDeFabrication): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({
      choix: [],
      categorie: element.categorie,
      saisie: { reference: element.reference?.value ?? '', libelle: element.libelle?.value ?? '' },
      id: element.id,
      refus: undefined,
    });
  }

  estValide(): this is FormulaireElementDeFabrication & { readonly categorie: CategorieDeProduit } {
    return Object.values(this.erreurs()).every(erreur => erreur === undefined);
  }

  produireCommande(): Result<CommandeElement, ErreursFormulaireElement> {
    if (!this.estValide()) {
      return err(this.erreurs());
    }
    const reference = this.referenceSaisie();
    const libelle = this.libelleSaisi();

    if (this.id === undefined) {
      return ok({ kind: 'CREATION', categorie: this.categorie, reference, libelle });
    }
    return ok({ kind: 'MODIFICATION', id: this.id, reference, libelle });
  }

  avecCategorie(code: string): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({
      choix: this.choix,
      categorie: this.choix.find(categorie => categorie.value === code),
      saisie: this.saisie,
      id: this.id,
      refus: this.refus?.code === 'categorie-inconnue' ? undefined : this.refus,
    });
  }

  avecReference(reference: string): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({
      choix: this.choix,
      categorie: this.categorie,
      saisie: { ...this.saisie, reference },
      id: this.id,
      refus: this.refusApresReference(reference),
    });
  }

  avecLibelle(libelle: string): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({
      choix: this.choix,
      categorie: this.categorie,
      saisie: { ...this.saisie, libelle },
      id: this.id,
      refus: this.refus,
    });
  }

  avecRefus(refus: RefusDeCommande): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({ choix: this.choix, categorie: this.categorie, saisie: this.saisie, id: this.id, refus });
  }

  erreurCategorie(): string | undefined {
    return this.categorie === undefined ? CATEGORIE_A_CHOISIR : undefined;
  }

  erreurReference(): string | undefined {
    if (this.refus?.code === 'reference-deja-utilisee') {
      return this.refus.message;
    }
    return this.referenceEstRenseignee() ? ReferenceDElement.erreur(this.saisie.reference) : undefined;
  }

  erreurLibelle(): string | undefined {
    return this.libelleEstRenseigne() ? LibelleDElement.erreur(this.saisie.libelle) : undefined;
  }

  erreurEnregistrement(): string | undefined {
    return this.refus === undefined || this.refus.code === 'reference-deja-utilisee' ? undefined : this.refus.message;
  }

  private erreurs(): ErreursFormulaireElement {
    return {
      categorie: this.erreurCategorie(),
      reference: this.erreurReference(),
      libelle: this.erreurLibelle(),
      enregistrement: this.erreurEnregistrement(),
    };
  }

  private refusApresReference(reference: string): RefusDeCommande | undefined {
    return this.doublonCorrige(reference) ? undefined : this.refus;
  }

  private doublonCorrige(reference: string): boolean {
    return reference !== this.saisie.reference && this.refus?.code === 'reference-deja-utilisee';
  }

  private referenceSaisie(): ReferenceDElement | undefined {
    return this.referenceEstRenseignee() ? new ReferenceDElement(this.saisie.reference) : undefined;
  }

  private libelleSaisi(): LibelleDElement | undefined {
    return this.libelleEstRenseigne() ? new LibelleDElement(this.saisie.libelle) : undefined;
  }

  private referenceEstRenseignee(): boolean {
    return this.saisie.reference.trim() !== '';
  }

  private libelleEstRenseigne(): boolean {
    return this.saisie.libelle.trim() !== '';
  }
}
