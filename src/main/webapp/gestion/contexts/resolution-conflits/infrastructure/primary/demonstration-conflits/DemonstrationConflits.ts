import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, inject, input, output, signal } from '@angular/core';
import { DemonstrationConflitsPort, IncidentDemo } from '../../../domain/dossier/DemonstrationConflitsPort';
import { LIBELLES_CONFLITS } from '../LibellesConflits';

@Component({ selector: 'glm-demonstration-conflits', templateUrl: './DemonstrationConflits.html' })
export class DemonstrationConflits {
  readonly changed = output();
  readonly disabled = input(false);
  private readonly demonstration = inject(DemonstrationConflitsPort);
  private readonly errors = inject(ErrorHandlerPort);
  protected readonly libelles = LIBELLES_CONFLITS;
  protected readonly incidents: readonly IncidentDemo[] = [
    'PANNE_LECTURE',
    'PANNE_APERCU',
    'PANNE_CONFIRMATION',
    'CONCURRENCE',
    'ISSUE_INCONNUE',
    'LECTURE_PARTIELLE',
  ];
  protected readonly arme = signal<IncidentDemo | undefined>(undefined);
  protected readonly erreur = signal(false);

  protected arm(incident: IncidentDemo): void {
    this.demonstration.arm(incident);
    this.arme.set(incident);
  }

  protected async reset(): Promise<void> {
    this.erreur.set(false);
    try {
      await this.demonstration.reset();
      this.arme.set(undefined);
      this.changed.emit();
    } catch (error: unknown) {
      this.erreur.set(true);
      this.errors.handleError(error);
    }
  }
}
