import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../../domain/CategoriesDeProduitPort';
import { FormulaireCategorieDeProduit } from '../../../domain/FormulaireCategorieDeProduit';
import { OrdreDesCategories } from '../../../domain/OrdreDesCategories';
import { OrdreIncomplet } from '../../../domain/OrdreIncomplet';
import {
  ConfirmationSuppressionCategorieDialog,
  ConfirmationSuppressionCategorieDialogData,
} from '../confirmation-suppression-categorie-dialog/ConfirmationSuppressionCategorieDialog';
import { LIBELLES_CATEGORIES_DE_PRODUIT } from '../LibellesElementsDeFabrication';

@Component({
  selector: 'glm-categories-de-produit-dialog',
  templateUrl: './CategoriesDeProduitDialog.html',
  imports: [ErrorMessage, Icon, TextField, MatDialogModule, MatButtonModule],
})
export class CategoriesDeProduitDialog implements OnInit {
  private readonly port = inject(CategoriesDeProduitPort);
  private readonly errors = inject(ErrorHandlerPort);
  private readonly dialogs = inject(MatDialog);

  protected readonly libelles = LIBELLES_CATEGORIES_DE_PRODUIT;
  protected readonly ordre = signal(new OrdreDesCategories([]));
  protected readonly deplacement = signal(false);
  protected readonly refusDeplacement = signal<OrdreIncomplet | undefined>(undefined);
  protected readonly erreurDeplacement = signal(false);
  protected readonly chargement = signal(true);
  protected readonly echec = signal(false);
  protected readonly formulaire = signal(FormulaireCategorieDeProduit.vide());
  protected readonly soumis = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly erreurTechnique = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.errors.observe(this.load());
  }

  protected changeCode(code: string): void {
    this.formulaire.update(formulaire => formulaire.avecCode(code));
  }

  protected monter(categorie: CategorieDeProduit): void {
    this.errors.observe(this.reorder(this.ordre().apresMontee(categorie)));
  }

  protected descendre(categorie: CategorieDeProduit): void {
    this.errors.observe(this.reorder(this.ordre().apresDescente(categorie)));
  }

  protected supprimer(categorie: CategorieDeProduit): void {
    const dialogRef = this.dialogs.open<ConfirmationSuppressionCategorieDialog, ConfirmationSuppressionCategorieDialogData, boolean>(
      ConfirmationSuppressionCategorieDialog,
      { data: { categorie }, width: '28rem', maxWidth: 'calc(100vw - 2rem)' },
    );
    dialogRef.afterClosed().subscribe(supprimee => {
      if (supprimee === true) {
        this.reload();
      }
    });
  }

  protected declarer(event: Event): void {
    event.preventDefault();
    this.errors.observe(this.declare());
  }

  private async load(): Promise<void> {
    this.chargement.set(true);
    this.echec.set(false);
    try {
      this.ordre.set(new OrdreDesCategories(await this.port.categories()));
    } catch {
      this.echec.set(true);
    } finally {
      this.chargement.set(false);
    }
  }

  private async reorder(ordre: OrdreDesCategories): Promise<void> {
    this.deplacement.set(true);
    this.refusDeplacement.set(undefined);
    this.erreurDeplacement.set(false);
    try {
      const resultat = await this.port.reordonner(ordre);
      if (resultat.ok) {
        this.ordre.set(ordre);
      } else {
        this.refusDeplacement.set(resultat.error);
        await this.load();
      }
    } catch (failure) {
      this.erreurDeplacement.set(true);
      this.errors.handleError(failure);
    } finally {
      this.deplacement.set(false);
    }
  }

  private async declare(): Promise<void> {
    if (this.enregistrement()) return;
    this.soumis.set(true);
    const categorie = this.formulaire().produireCategorie();
    if (!categorie.ok) return;
    this.enregistrement.set(true);
    this.erreurTechnique.set(false);
    try {
      const resultat = await this.port.declarer(categorie.value);
      if (resultat.ok) {
        this.formulaire.set(FormulaireCategorieDeProduit.vide());
        this.soumis.set(false);
        await this.load();
      } else {
        this.formulaire.update(formulaire => formulaire.avecRefus(resultat.error));
      }
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.enregistrement.set(false);
    }
  }
}
