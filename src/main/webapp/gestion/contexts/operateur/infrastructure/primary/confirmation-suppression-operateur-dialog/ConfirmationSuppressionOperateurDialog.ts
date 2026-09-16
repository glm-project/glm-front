import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Operateur } from '../../../domain/Operateur';
import { OperateursPort } from '../../../domain/OperateursPort';
import { RefusSuppressionOperateur } from '../../../domain/RefusSuppressionOperateur';

export interface ConfirmationSuppressionOperateurDialogData {
  readonly operateur: Operateur;
}

@Component({
  selector: 'glm-confirmation-suppression-operateur-dialog',
  templateUrl: './ConfirmationSuppressionOperateurDialog.html',
  styleUrl: './ConfirmationSuppressionOperateurDialog.css',
  imports: [MatDialogModule, MatButtonModule],
})
export class ConfirmationSuppressionOperateurDialog {
  private readonly data = inject<ConfirmationSuppressionOperateurDialogData>(MAT_DIALOG_DATA);
  protected readonly operateur = this.data.operateur;
  private readonly dialog = inject<MatDialogRef<ConfirmationSuppressionOperateurDialog, boolean>>(MatDialogRef);
  private readonly port = inject(OperateursPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly suppression = signal(false);
  protected readonly refus = signal<RefusSuppressionOperateur | undefined>(undefined);
  protected readonly erreurTechnique = signal(false);

  protected confirm(): void {
    this.errors.observe(this.remove());
  }

  private async remove(): Promise<void> {
    if (this.suppression()) return;
    this.suppression.set(true);
    this.refus.set(undefined);
    this.erreurTechnique.set(false);
    this.dialog.disableClose = true;
    try {
      const resultat = await this.port.supprimer(this.operateur.id);
      if (resultat.ok) {
        this.dialog.close(true);
      } else {
        this.refus.set(resultat.error);
      }
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.suppression.set(false);
      this.dialog.disableClose = false;
    }
  }
}
