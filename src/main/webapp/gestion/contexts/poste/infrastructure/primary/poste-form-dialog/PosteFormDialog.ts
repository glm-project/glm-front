import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, computed, inject, signal } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommandeEnregistrementPoste } from '../../../domain/CommandeEnregistrementPoste';
import { FormulairePosteDeTravail } from '../../../domain/FormulairePosteDeTravail';
import { NatureDeTravail } from '../../../domain/NatureDeTravail';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { PostesPort } from '../../../domain/PostesPort';

export interface PosteFormDialogData {
  readonly poste: PosteDeTravail | null;
  readonly natures: readonly NatureDeTravail[];
  readonly afterSave: () => Promise<void>;
}

@Component({
  selector: 'glm-poste-form-dialog',
  templateUrl: './PosteFormDialog.html',
  styleUrl: './PosteFormDialog.css',
  imports: [MatDialogModule, MatButtonModule, MatAutocompleteModule],
})
export class PosteFormDialog {
  private readonly data = inject<PosteFormDialogData>(MAT_DIALOG_DATA);
  private readonly poste = this.data.poste;
  private readonly dialog = inject<MatDialogRef<PosteFormDialog, boolean>>(MatDialogRef);
  private readonly port = inject(PostesPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly titre = this.poste === null ? 'Nouveau poste' : 'Modifier le poste';
  protected readonly formulaire = signal(
    this.poste === null ? FormulairePosteDeTravail.pourCreation() : FormulairePosteDeTravail.pourModification(this.poste),
  );
  protected readonly soumis = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly erreurTechnique = signal(false);
  protected readonly suggestions = computed(() => {
    const saisie = this.formulaire().saisie.nature.toLocaleLowerCase('fr');
    return this.data.natures.filter(nature => nature.value.toLocaleLowerCase('fr').includes(saisie));
  });

  protected changeLibelle(libelle: string): void {
    this.formulaire.update(formulaire => formulaire.avecLibelle(libelle));
  }

  protected changeNature(nature: string): void {
    this.formulaire.update(formulaire => formulaire.avecNature(nature));
  }

  protected changeCoutHoraire(coutHoraire: string): void {
    this.formulaire.update(formulaire => formulaire.avecCoutHoraire(coutHoraire));
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.errors.observe(this.persist());
  }

  private async persist(): Promise<void> {
    if (this.enregistrement()) return;
    this.soumis.set(true);
    const commande = this.formulaire().produireCommande();
    if (!commande.ok) return;
    this.enregistrement.set(true);
    this.erreurTechnique.set(false);
    this.dialog.disableClose = true;
    try {
      const resultat = await this.execute(commande.value);
      if (resultat.ok) {
        await this.data.afterSave();
        this.dialog.close(true);
      } else {
        this.formulaire.update(formulaire => formulaire.avecRefus(resultat.error));
      }
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.enregistrement.set(false);
      this.dialog.disableClose = false;
    }
  }

  private execute(commande: CommandeEnregistrementPoste) {
    return this.poste === null ? this.port.creer(commande) : this.port.modifier(this.poste.id, commande);
  }
}
