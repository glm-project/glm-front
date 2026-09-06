import { JournalDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';
import { FenetreOperateur, IdentiteOperateurDesigne } from './FenetreOperateur';

export const DESIGNATION_INACTIVITY_MS = 30_000;

export interface DesignationResolution {
  generation: number;
  code: string;
}

export interface DesignationState {
  code: string;
  unknownCode: boolean;
  operateur: IdentiteOperateurDesigne | undefined;
  canValidate: boolean;
  deadline: number | undefined;
}

export class DesignationOperateur {
  private saisie = '';
  private inconnu = false;
  private designated = false;
  private resolution: DesignationResolution | undefined;
  private closing = false;
  private deadline: number | undefined;
  private generation = 0;
  private fenetre: FenetreOperateur | undefined;

  snapshot(): DesignationState {
    return {
      code: this.saisie,
      unknownCode: this.inconnu,
      operateur: this.operateur(),
      canValidate: this.saisie.length > 0 && this.canEdit() && this.resolution === undefined && !this.closing,
      deadline: this.deadline,
    };
  }

  registerPress(now: number): boolean {
    if (this.hasExpired(now)) {
      this.finish();
      return false;
    }
    this.deadline = now + DESIGNATION_INACTIVITY_MS;
    return true;
  }

  enterDigit(digit: string, now: number): void {
    if (/^\d$/.test(digit) && this.registerPress(now) && this.canEdit()) {
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

  beginResolution(now: number): DesignationResolution | undefined {
    if (!this.registerPress(now) || !this.snapshot().canValidate) return undefined;
    this.resolution = { generation: this.generation, code: this.saisie };
    return this.resolution;
  }

  completeResolution(resolution: DesignationResolution, now: number): boolean {
    this.expire(now);
    if (resolution.generation !== this.generation) return false;
    this.designated = true;
    this.saisie = '';
    return true;
  }

  failResolution(resolution: DesignationResolution, now: number): void {
    if (this.hasExpired(now)) {
      this.finish();
    } else if (resolution.generation === this.generation) {
      this.saisie = '';
      this.inconnu = true;
    }
  }

  endResolution(): void {
    this.resolution = undefined;
  }

  expire(now: number): void {
    if (this.hasExpired(now)) this.finish();
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

  openWindow(entreprise: string, vue: JournalDuPupitre, code: string, now: number): FenetreOperateur {
    this.requireClosedWindow();
    this.fenetre = new FenetreOperateur(entreprise, vue, code, now);
    if (this.resolution === undefined) {
      this.designated = true;
      this.deadline = now + DESIGNATION_INACTIVITY_MS;
    }
    return this.fenetre;
  }

  releaseWindow(): void {
    this.fenetre = undefined;
    this.designated = false;
  }

  completeClosure(): void {
    this.closing = false;
  }

  window(): FenetreOperateur | undefined {
    return this.fenetre;
  }

  requireClosedWindow(): void {
    if (this.fenetre !== undefined || this.closing) {
      throw new Error('Une fenetre operateur est deja ouverte.');
    }
  }

  requireWindow(now: number): FenetreOperateur {
    if (!this.registerPress(now) || !this.designated || this.fenetre === undefined) {
      throw new Error('Aucune fenetre operateur ouverte.');
    }
    return this.fenetre;
  }

  private operateur(): IdentiteOperateurDesigne | undefined {
    if (this.designated) return this.fenetre?.operateur;
    return undefined;
  }

  private canEdit(): boolean {
    return (this.resolution === undefined || this.resolution.generation !== this.generation) && !this.designated;
  }

  private hasExpired(now: number): boolean {
    return this.deadline !== undefined && now >= this.deadline;
  }
}
