import { PupitreHorsLigne } from '@/app/atelier/application/PupitreHorsLigne';
import { OperateurDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';

export const INACTIVITE_DESIGNATION_MS = 30_000;

@Injectable()
export class DesignationDuPupitre implements OnDestroy {
  private readonly pupitre = inject(PupitreHorsLigne);
  private readonly saisie = signal('');
  private readonly inconnu = signal(false);
  private readonly identite = signal<OperateurDuPupitre | undefined>(undefined);
  private readonly resolution = signal(false);
  private deadline: number | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;

  readonly code = this.saisie.asReadonly();
  readonly unknownCode = this.inconnu.asReadonly();
  readonly operateur = this.identite.asReadonly();
  readonly canValidate = computed(() => this.saisie().length > 0 && this.canEdit());

  registerPress(): boolean {
    if (this.hasExpired()) {
      void this.finish();
      return false;
    }
    clearTimeout(this.timer);
    this.deadline = Date.now() + INACTIVITE_DESIGNATION_MS;
    this.timer = setTimeout(() => {
      void this.finish();
    }, INACTIVITE_DESIGNATION_MS);
    return true;
  }

  enterDigit(digit: string): void {
    if (/^[0-9]$/.test(digit) && this.registerPress() && this.canEdit()) {
      this.inconnu.set(false);
      this.saisie.update(code => code + digit);
    }
  }

  erase(): void {
    if (this.registerPress() && this.canEdit()) {
      this.inconnu.set(false);
      this.saisie.update(code => code.slice(0, -1));
    }
  }

  async validate(): Promise<void> {
    if (!this.registerPress() || !this.canValidate()) return;
    const generation = this.generation;
    this.resolution.set(true);
    try {
      const operateur = await this.pupitre.openWindow(this.saisie());
      if (generation !== this.generation || this.hasExpired()) {
        await this.finish();
        await this.pupitre.closeWindow();
        return;
      }
      this.identite.set(operateur);
      this.saisie.set('');
    } catch {
      if (this.hasExpired()) {
        await this.finish();
      } else if (generation === this.generation) {
        this.saisie.set('');
        this.inconnu.set(true);
      }
    } finally {
      this.resolution.set(false);
    }
  }

  async finish(): Promise<void> {
    clearTimeout(this.timer);
    this.deadline = undefined;
    this.generation++;
    const wasDesignated = this.identite() !== undefined;
    this.identite.set(undefined);
    this.saisie.set('');
    this.inconnu.set(false);
    if (wasDesignated) {
      this.resolution.set(true);
      try {
        await this.pupitre.closeWindow();
      } finally {
        this.resolution.set(false);
      }
    }
  }

  ngOnDestroy(): void {
    void this.finish();
  }

  private canEdit(): boolean {
    return !this.resolution() && this.identite() === undefined;
  }

  private hasExpired(): boolean {
    return this.deadline !== undefined && Date.now() >= this.deadline;
  }
}
