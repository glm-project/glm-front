import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorMessage } from '@/gestion/shared/design-system/infrastructure/primary/error-message/ErrorMessage';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../../domain/CategoriesDeProduitPort';
import { FormulaireCategorieDeProduit } from '../../../domain/FormulaireCategorieDeProduit';
import { LIBELLES_CATEGORIES_DE_PRODUIT } from '../LibellesElementsDeFabrication';

@Component({
  selector: 'glm-categories-de-produit-dialog',
  templateUrl: './CategoriesDeProduitDialog.html',
  imports: [ErrorMessage, TextField, MatDialogModule, MatButtonModule],
})
export class CategoriesDeProduitDialog implements OnInit {
  private readonly port = inject(CategoriesDeProduitPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly libelles = LIBELLES_CATEGORIES_DE_PRODUIT;
  protected readonly categories = signal<readonly CategorieDeProduit[]>([]);
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

  protected declarer(event: Event): void {
    event.preventDefault();
    this.errors.observe(this.declare());
  }

  private async load(): Promise<void> {
    this.chargement.set(true);
    this.echec.set(false);
    try {
      this.categories.set(await this.port.categories());
    } catch {
      this.echec.set(true);
    } finally {
      this.chargement.set(false);
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
