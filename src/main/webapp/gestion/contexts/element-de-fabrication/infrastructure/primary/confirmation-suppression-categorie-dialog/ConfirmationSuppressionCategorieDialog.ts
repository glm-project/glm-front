import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConfirmationContent } from '@/gestion/shared/design-system/infrastructure/primary/confirmation-content/ConfirmationContent';
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../../domain/CategoriesDeProduitPort';
import { RefusSuppressionCategorie } from '../../../domain/RefusSuppressionCategorie';
import { LIBELLES_SUPPRESSION_CATEGORIE } from '../LibellesElementsDeFabrication';

export interface ConfirmationSuppressionCategorieDialogData {
  readonly categorie: CategorieDeProduit;
}

@Component({
  selector: 'glm-confirmation-suppression-categorie-dialog',
  templateUrl: './ConfirmationSuppressionCategorieDialog.html',
  imports: [ConfirmationContent],
})
export class ConfirmationSuppressionCategorieDialog {
  private readonly data = inject<ConfirmationSuppressionCategorieDialogData>(MAT_DIALOG_DATA);
  protected readonly categorie = this.data.categorie;
  protected readonly dialog = inject<MatDialogRef<ConfirmationSuppressionCategorieDialog, boolean>>(MatDialogRef);
  private readonly port = inject(CategoriesDeProduitPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly libelles = LIBELLES_SUPPRESSION_CATEGORIE;
  protected readonly suppression = signal(false);
  protected readonly refus = signal<RefusSuppressionCategorie | undefined>(undefined);
  protected readonly erreurTechnique = signal(false);

  protected confirm(): void {
    this.errors.observe(this.remove());
  }

  private async remove(): Promise<void> {
    this.suppression.set(true);
    this.refus.set(undefined);
    this.erreurTechnique.set(false);
    this.dialog.disableClose = true;
    try {
      const resultat = await this.port.supprimer(this.categorie);
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
