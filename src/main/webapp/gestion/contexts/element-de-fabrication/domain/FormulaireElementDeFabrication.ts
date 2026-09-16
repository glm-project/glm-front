import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationElement } from './CommandeCreationElement';
import { CommandeModificationElement } from './CommandeModificationElement';
import { ElementDeFabrication } from './ElementDeFabrication';
import { ElementDeFabricationId } from './ElementDeFabricationId';
import { ErreursFormulaireElement } from './ErreursFormulaireElement';
import { LibelleDElement } from './LibelleDElement';
import { ReferenceDElement } from './ReferenceDElement';
import { RefusModificationElement } from './RefusModificationElement';
import { TypeDElementDeFabrication } from './TypeDElementDeFabrication';

interface SaisieElement {
  readonly reference: string;
  readonly libelle: string;
}

interface EtatFormulaireElement {
  readonly type: TypeDElementDeFabrication;
  readonly saisie: SaisieElement;
  readonly id: ElementDeFabricationId | undefined;
  readonly refus: RefusModificationElement | undefined;
}

export type CommandeElement = CommandeCreationElement | CommandeModificationElement;

const SAISIE_VIDE: SaisieElement = { reference: '', libelle: '' };

export class FormulaireElementDeFabrication {
  readonly type: TypeDElementDeFabrication;
  readonly saisie: SaisieElement;
  readonly id: ElementDeFabricationId | undefined;
  private readonly refus: RefusModificationElement | undefined;

  private constructor(etat: EtatFormulaireElement) {
    this.type = etat.type;
    this.saisie = etat.saisie;
    this.id = etat.id;
    this.refus = etat.refus;
  }

  static pourCreation(type: TypeDElementDeFabrication): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({ type, saisie: SAISIE_VIDE, id: undefined, refus: undefined });
  }

  static pourModification(element: ElementDeFabrication): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({
      type: element.type,
      saisie: { reference: element.reference?.value ?? '', libelle: element.libelle?.value ?? '' },
      id: element.id,
      refus: undefined,
    });
  }

  estValide(): boolean {
    return Object.values(this.erreurs()).every(erreur => erreur === undefined);
  }

  produireCommande(): Result<CommandeElement, ErreursFormulaireElement> {
    if (!this.estValide()) {
      return err(this.erreurs());
    }
    const reference = this.referenceSaisie();
    const libelle = this.libelleSaisi();

    if (this.id === undefined) {
      return ok({ kind: 'CREATION', type: this.type, reference, libelle });
    }
    return ok({ kind: 'MODIFICATION', id: this.id, reference, libelle });
  }

  avecReference(reference: string): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({
      type: this.type,
      saisie: { ...this.saisie, reference },
      id: this.id,
      refus: this.refusApresReference(reference),
    });
  }

  avecLibelle(libelle: string): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({
      type: this.type,
      saisie: { ...this.saisie, libelle },
      id: this.id,
      refus: this.refus,
    });
  }

  avecRefus(refus: RefusModificationElement): FormulaireElementDeFabrication {
    return new FormulaireElementDeFabrication({ type: this.type, saisie: this.saisie, id: this.id, refus });
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
    return this.refus?.code === 'element-introuvable' ? this.refus.message : undefined;
  }

  private erreurs(): ErreursFormulaireElement {
    return {
      reference: this.erreurReference(),
      libelle: this.erreurLibelle(),
      enregistrement: this.erreurEnregistrement(),
    };
  }

  private refusApresReference(reference: string): RefusModificationElement | undefined {
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
