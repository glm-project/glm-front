import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConfirmationContent } from '@/gestion/shared/design-system/infrastructure/primary/confirmation-content/ConfirmationContent';
import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CorrectionDUneActivite, IssueDeCorrection } from '../../../application/CorrectionDUneActivite';
import { ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';
import { presentationDuRetrait } from './PresentationDuRetrait';

export interface DonneesDuRetrait {
  readonly journee: JourneeACorriger;
  readonly activite: ActiviteTerminee;
}

@Component({
  selector: 'glm-retrait-de-l-activite',
  templateUrl: './RetraitDeLActivite.html',
  imports: [ConfirmationContent],
})
export class RetraitDeLActivite {
  private readonly donnees = inject<DonneesDuRetrait>(MAT_DIALOG_DATA);
  protected readonly dialog = inject<MatDialogRef<RetraitDeLActivite, IssueDeCorrection>>(MatDialogRef);
  private readonly correction = inject(CorrectionDUneActivite);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.retrait;
  protected readonly presentation = presentationDuRetrait(this.donnees.journee, this.donnees.activite);
  protected readonly enCours = computed(() => this.correction.etat().kind === 'EN_COURS');
  protected readonly echec = signal(false);

  protected confirmer(): void {
    this.errors.observe(this.retirer());
  }

  private async retirer(): Promise<void> {
    this.dialog.disableClose = true;
    await this.correction.retirer(this.donnees.activite);
    this.dialog.disableClose = this.enCours();
    const etat = this.correction.etat();
    this.echec.set(etat.kind === 'ECHEC');
    if (etat.kind === 'A_RELIRE') {
      this.dialog.close(etat.issue);
    }
  }
}
