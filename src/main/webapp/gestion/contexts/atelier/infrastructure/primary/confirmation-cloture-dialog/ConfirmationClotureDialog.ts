import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AtelierPort } from '../../../domain/AtelierPort';
import { ElementALAtelier } from '../../../domain/ElementALAtelier';
import { SuiviIntrouvable } from '../../../domain/SuiviIntrouvable';
import { LIBELLES_CLOTURE } from '../LibellesAtelier';

export interface ConfirmationClotureDialogData {
  readonly element: ElementALAtelier;
}

@Component({
  selector: 'glm-confirmation-cloture-dialog',
  templateUrl: './ConfirmationClotureDialog.html',
  styleUrl: './ConfirmationClotureDialog.css',
  imports: [MatDialogModule, MatButtonModule],
})
export class ConfirmationClotureDialog {
  private readonly data = inject<ConfirmationClotureDialogData>(MAT_DIALOG_DATA);
  private readonly dialog = inject<MatDialogRef<ConfirmationClotureDialog, boolean>>(MatDialogRef);
  private readonly port = inject(AtelierPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly libelles = LIBELLES_CLOTURE;
  protected readonly element = this.data.element;
  protected readonly cloture = signal(false);
  protected readonly refus = signal<SuiviIntrouvable | undefined>(undefined);
  protected readonly erreurTechnique = signal(false);

  protected confirm(): void {
    this.errors.observe(this.close());
  }

  private async close(): Promise<void> {
    if (this.cloture()) return;
    this.cloture.set(true);
    this.refus.set(undefined);
    this.erreurTechnique.set(false);
    this.dialog.disableClose = true;
    try {
      const resultat = await this.port.cloturer(this.element.suivi);
      if (resultat.ok) {
        this.dialog.close(true);
      } else {
        this.refus.set(resultat.error);
      }
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.cloture.set(false);
      this.dialog.disableClose = false;
    }
  }
}
