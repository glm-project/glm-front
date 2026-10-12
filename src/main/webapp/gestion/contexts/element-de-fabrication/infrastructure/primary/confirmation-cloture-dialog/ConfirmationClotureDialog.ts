import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConfirmationContent } from '@/gestion/shared/design-system/infrastructure/primary/confirmation-content/ConfirmationContent';
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActesDAtelierPort } from '../../../domain/ActesDAtelierPort';
import { RefusDActeDAtelier } from '../../../domain/RefusDActeDAtelier';
import { SuiviDuProduitId } from '../../../domain/SuiviDuProduitId';
import { LIBELLES_CLOTURE } from '../LibellesElementsDeFabrication';

export interface ConfirmationClotureDialogData {
  readonly numero: string;
  readonly suivi: SuiviDuProduitId;
}

@Component({
  selector: 'glm-confirmation-cloture-dialog',
  templateUrl: './ConfirmationClotureDialog.html',
  imports: [ConfirmationContent],
})
export class ConfirmationClotureDialog {
  private readonly data = inject<ConfirmationClotureDialogData>(MAT_DIALOG_DATA);
  protected readonly dialog = inject<MatDialogRef<ConfirmationClotureDialog, boolean>>(MatDialogRef);
  private readonly actes = inject(ActesDAtelierPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly libelles = LIBELLES_CLOTURE;
  protected readonly numero = this.data.numero;
  protected readonly cloture = signal(false);
  protected readonly refus = signal<RefusDActeDAtelier | undefined>(undefined);
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
      const resultat = await this.actes.cloturer(this.data.suivi);
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
