import { Entreprise } from '../journal-du-pupitre/Entreprise';
import { JournalDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { FenetreOperateur, IdentiteOperateurDesigne } from './FenetreOperateur';
import { IdentiteDeFenetre } from './IdentiteDeFenetre';
import { Matricule } from './Matricule';

export const DESIGNATION_INACTIVITY_MS = 30_000;

export const isFenetreIdentifiedBy = (fenetre: FenetreOperateur | undefined, identity: IdentiteDeFenetre): fenetre is FenetreOperateur =>
  !(fenetre === undefined || !fenetre.identity().equals(identity));

export interface DesignationResolution {
  readonly generation: number;
  readonly code: Matricule;
}

export interface DesignationState {
  readonly code: string;
  readonly unknownCode: boolean;
  readonly operateur: IdentiteOperateurDesigne | undefined;
  readonly canValidate: boolean;
  readonly deadline: number | undefined;
}

export interface PressResult {
  readonly designation: DesignationOperateur;
  readonly accepted: boolean;
}

export interface ResolutionResult {
  readonly designation: DesignationOperateur;
  readonly resolution: DesignationResolution | undefined;
}

export interface CompletionResult {
  readonly designation: DesignationOperateur;
  readonly accepted: boolean;
}

export interface OpeningWindowResult {
  readonly designation: DesignationOperateur;
  readonly fenetre: FenetreOperateur;
}

interface EtatDeDesignation {
  readonly saisie: Matricule;
  readonly inconnu: boolean;
  readonly designated: boolean;
  readonly resolution: DesignationResolution | undefined;
  readonly closing: boolean;
  readonly deadline: number | undefined;
  readonly generation: number;
  readonly fenetre: FenetreOperateur | undefined;
  readonly windowId: IdentiteDeFenetre;
}

export class DesignationOperateur {
  private constructor(private readonly etat: EtatDeDesignation) {}

  static empty(): DesignationOperateur {
    return new DesignationOperateur({
      saisie: Matricule.vide(),
      inconnu: false,
      designated: false,
      resolution: undefined,
      closing: false,
      deadline: undefined,
      generation: 0,
      fenetre: undefined,
      windowId: new IdentiteDeFenetre(0),
    });
  }

  snapshot(): DesignationState {
    return {
      code: this.etat.saisie.toString(),
      unknownCode: this.etat.inconnu,
      operateur: this.operateur(),
      canValidate: !this.etat.saisie.isEmpty() && this.canEdit() && this.etat.resolution === undefined && !this.etat.closing,
      deadline: this.etat.deadline,
    };
  }

  afterPress(now: number): PressResult {
    if (this.hasExpired(now)) return { designation: this.afterFinish(), accepted: false };
    return { designation: this.with({ deadline: now + DESIGNATION_INACTIVITY_MS }), accepted: true };
  }

  afterDigit(digit: string, now: number): DesignationOperateur {
    if (!Matricule.accepts(digit)) return this;
    const press = this.afterPress(now);
    if (this.isEditingRefused(press)) return press.designation;
    return press.designation.with({ saisie: press.designation.etat.saisie.afterDigit(digit), inconnu: false });
  }

  afterErasing(now: number): DesignationOperateur {
    const press = this.afterPress(now);
    if (this.isEditingRefused(press)) return press.designation;
    return press.designation.with({ saisie: press.designation.etat.saisie.afterErasing(), inconnu: false });
  }

  afterBeginningResolution(now: number): ResolutionResult {
    const press = this.afterPress(now);
    if (this.isResolutionRefused(press)) return { designation: press.designation, resolution: undefined };
    const resolution = { generation: press.designation.etat.generation, code: press.designation.etat.saisie };
    return { designation: press.designation.with({ resolution }), resolution };
  }

  afterCompletingResolution(resolution: DesignationResolution, now: number): CompletionResult {
    const expired = this.afterExpiration(now);
    if (resolution.generation !== expired.etat.generation) return { designation: expired, accepted: false };
    return { designation: expired.with({ designated: true, saisie: Matricule.vide(), inconnu: false }), accepted: true };
  }

  afterFailingResolution(resolution: DesignationResolution, now: number): DesignationOperateur {
    const expired = this.afterExpiration(now);
    if (resolution.generation !== expired.etat.generation) return expired;
    return expired.with({ saisie: Matricule.vide(), inconnu: true });
  }

  afterEndingResolution(): DesignationOperateur {
    return this.with({ resolution: undefined });
  }

  afterExpiration(now: number): DesignationOperateur {
    return this.hasExpired(now) ? this.afterFinish() : this;
  }

  afterFinish(): DesignationOperateur {
    return this.with({
      deadline: undefined,
      generation: this.etat.generation + 1,
      closing: this.etat.closing || this.etat.designated,
      designated: false,
      saisie: Matricule.vide(),
      inconnu: false,
    });
  }

  needsClosure(): boolean {
    return this.etat.closing;
  }

  afterOpeningWindow(entreprise: Entreprise, vue: JournalDuPupitre, code: Matricule, now: number): OpeningWindowResult {
    this.requireClosedWindow();
    const fenetre = FenetreOperateur.open(entreprise, vue, code, now, this.etat.windowId);
    const designation =
      this.etat.resolution === undefined
        ? this.with({ fenetre, designated: true, deadline: now + DESIGNATION_INACTIVITY_MS })
        : this.with({ fenetre });
    return { designation, fenetre };
  }

  afterReplacingWindow(fenetre: FenetreOperateur): DesignationOperateur {
    if (this.isWindowReplacementRefused(fenetre)) return this;
    return this.with({ fenetre });
  }

  afterReleasingWindow(): DesignationOperateur {
    return this.with({ fenetre: undefined, designated: false, windowId: this.etat.windowId.next() });
  }

  afterCompletingClosure(): DesignationOperateur {
    return this.with({ closing: false });
  }

  windowAfterPress(now: number): PressResult & { readonly fenetre: FenetreOperateur | undefined } {
    const press = this.afterPress(now);
    return { ...press, fenetre: press.designation.etat.designated ? press.designation.etat.fenetre : undefined };
  }

  window(): FenetreOperateur | undefined {
    return this.etat.fenetre;
  }

  canReconcileWith(entreprise: Entreprise | undefined): entreprise is Entreprise {
    const fenetre = this.window();
    return !(entreprise === undefined || (fenetre !== undefined && !fenetre.belongsTo(entreprise)));
  }

  visibleWindow(): FenetreOperateur | undefined {
    return this.etat.designated ? this.etat.fenetre : undefined;
  }

  private requireClosedWindow(): void {
    if (this.hasUnclosedWindow()) throw new Error('Une fenetre operateur est deja ouverte.');
  }

  private hasUnclosedWindow(): boolean {
    return this.etat.fenetre !== undefined || this.etat.closing;
  }

  private isWindowReplacementRefused(fenetre: FenetreOperateur): boolean {
    return this.etat.fenetre === undefined || !this.etat.fenetre.hasIdentity(fenetre);
  }

  private isEditingRefused(press: PressResult): boolean {
    return !press.accepted || !press.designation.canEdit();
  }

  private isResolutionRefused(press: PressResult): boolean {
    return !press.accepted || !press.designation.snapshot().canValidate;
  }

  private operateur(): IdentiteOperateurDesigne | undefined {
    return this.etat.designated ? this.etat.fenetre?.operateur : undefined;
  }

  private canEdit(): boolean {
    return (this.etat.resolution === undefined || this.etat.resolution.generation !== this.etat.generation) && !this.etat.designated;
  }

  private hasExpired(now: number): boolean {
    return this.etat.deadline !== undefined && now >= this.etat.deadline;
  }

  private with(change: Partial<EtatDeDesignation>): DesignationOperateur {
    return new DesignationOperateur({ ...this.etat, ...change });
  }
}
