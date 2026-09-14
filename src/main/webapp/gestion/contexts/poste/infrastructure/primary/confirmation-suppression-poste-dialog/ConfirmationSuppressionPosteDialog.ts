import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { PostesPort } from '../../../domain/PostesPort';
import { RefusSuppressionPoste } from '../../../domain/RefusSuppressionPoste';

export interface ConfirmationSuppressionPosteDialogData {
  readonly poste: PosteDeTravail;
  readonly afterDelete: () => Promise<void>;
}

@Component({
  selector: 'glm-confirmation-suppression-poste-dialog',
  templateUrl: './ConfirmationSuppressionPosteDialog.html',
  styleUrl: './ConfirmationSuppressionPosteDialog.css',
  imports: [MatDialogModule, MatButtonModule],
})
export class ConfirmationSuppressionPosteDialog {
  private readonly data = inject<ConfirmationSuppressionPosteDialogData>(MAT_DIALOG_DATA);
  protected readonly poste = this.data.poste;
  private readonly dialog = inject<MatDialogRef<ConfirmationSuppressionPosteDialog, boolean>>(MatDialogRef);
  private readonly port = inject(PostesPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly suppression = signal(false);
  protected readonly refus = signal<RefusSuppressionPoste | undefined>(undefined);
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
      const resultat = await this.port.supprimer(this.poste.id);
      if (resultat.ok) {
        await this.data.afterDelete();
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
