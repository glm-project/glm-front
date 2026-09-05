import { FenetreOperateur } from './FenetreOperateur';
import { OperateurDuPupitre, PupitreLocal } from './PupitreLocal';

export const INACTIVITE_DESIGNATION_MS = 30_000;

export interface ResolutionDesignation {
  generation: number;
  code: string;
}

export interface EtatDesignation {
  code: string;
  unknownCode: boolean;
  operateur: OperateurDuPupitre | undefined;
  canValidate: boolean;
  deadline: number | undefined;
}

export class DesignationOperateur {
  private saisie = '';
  private inconnu = false;
  private designated = false;
  private resolving = false;
  private closing = false;
  private deadline: number | undefined;
  private generation = 0;
  private fenetre: FenetreOperateur | undefined;

  snapshot(): EtatDesignation {
    return {
      code: this.saisie,
      unknownCode: this.inconnu,
      operateur: this.operateur(),
      canValidate: this.saisie.length > 0 && this.canEdit(),
      deadline: this.deadline,
    };
  }

  registerPress(now: number): boolean {
    if (this.hasExpired(now)) {
      this.finish();
      return false;
    }
    this.deadline = now + INACTIVITE_DESIGNATION_MS;
    return true;
  }

  enterDigit(digit: string, now: number): void {
    if (/^[0-9]$/.test(digit) && this.registerPress(now) && this.canEdit()) {
      this.inconnu = false;
      this.saisie += digit;
    }
  }

  erase(now: number): void {
    if (this.registerPress(now) && this.canEdit()) {
      this.inconnu = false;
      this.saisie = this.saisie.slice(0, -1);
    }
  }

  beginResolution(now: number): ResolutionDesignation | undefined {
    if (!this.registerPress(now) || !this.snapshot().canValidate) return undefined;
    this.resolving = true;
    return { generation: this.generation, code: this.saisie };
  }

  completeResolution(resolution: ResolutionDesignation, now: number): boolean {
    if (resolution.generation !== this.generation || this.hasExpired(now)) {
      this.finish();
      return false;
    }
    this.designated = true;
    this.saisie = '';
    return true;
  }

  failResolution(resolution: ResolutionDesignation, now: number): void {
    if (this.hasExpired(now)) {
      this.finish();
    } else if (resolution.generation === this.generation) {
      this.saisie = '';
      this.inconnu = true;
    }
  }

  endResolution(): void {
    this.resolving = false;
  }

  finish(): void {
    this.deadline = undefined;
    this.generation++;
    this.closing ||= this.designated;
    this.designated = false;
    this.saisie = '';
    this.inconnu = false;
  }

  needsClosure(): boolean {
    return this.closing;
  }

  openWindow(entreprise: string, vue: PupitreLocal, code: string): FenetreOperateur {
    this.requireClosedWindow();
    this.fenetre = new FenetreOperateur(entreprise, vue, code);
    return this.fenetre;
  }

  releaseWindow(): void {
    this.fenetre = undefined;
  }

  completeClosure(): void {
    this.closing = false;
  }

  window(): FenetreOperateur | undefined {
    return this.fenetre;
  }

  requireClosedWindow(): void {
    if (this.fenetre !== undefined) {
      throw new Error('Une fenetre operateur est deja ouverte.');
    }
  }

  requireWindow(): FenetreOperateur {
    if (this.fenetre === undefined) {
      throw new Error('Aucune fenetre operateur ouverte.');
    }
    return this.fenetre;
  }

  private operateur(): OperateurDuPupitre | undefined {
    if (this.designated) return this.fenetre?.operateur;
    return undefined;
  }

  private canEdit(): boolean {
    return !this.resolving && !this.closing && !this.designated;
  }

  private hasExpired(now: number): boolean {
    return this.deadline !== undefined && now >= this.deadline;
  }
}
