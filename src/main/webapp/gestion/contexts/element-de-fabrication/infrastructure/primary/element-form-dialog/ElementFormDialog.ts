import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Result } from '@/app/shared/result/domain/Result';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { ElementDeFabrication } from '../../../domain/ElementDeFabrication';
import { ElementsDeFabricationPort } from '../../../domain/ElementsDeFabricationPort';
import { CommandeElement, FormulaireElementDeFabrication, RefusDeCommande } from '../../../domain/FormulaireElementDeFabrication';
import { LIBELLES_ELEMENTS_DE_FABRICATION, LIBELLES_FORMULAIRE_ELEMENT } from '../LibellesElementsDeFabrication';

export type ElementFormDialogData =
  | {
      readonly element: null;
      readonly categories: readonly CategorieDeProduit[];
      readonly categorie: CategorieDeProduit | undefined;
    }
  | { readonly element: ElementDeFabrication };

const formulairePour = (data: ElementFormDialogData): FormulaireElementDeFabrication =>
  data.element === null
    ? FormulaireElementDeFabrication.pourCreation(data.categories, data.categorie)
    : FormulaireElementDeFabrication.pourModification(data.element);

const titrePour = (data: ElementFormDialogData): string =>
  data.element === null ? LIBELLES_ELEMENTS_DE_FABRICATION.creation : LIBELLES_ELEMENTS_DE_FABRICATION.modification(data.element.numero());

@Component({
  selector: 'glm-element-form-dialog',
  templateUrl: './ElementFormDialog.html',
  styleUrls: ['../../../../../shared/design-system/infrastructure/primary/forms.css', './ElementFormDialog.css'],
  imports: [TextField, MatDialogModule, MatButtonModule],
})
export class ElementFormDialog {
  private readonly data = inject<ElementFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialog = inject<MatDialogRef<ElementFormDialog, boolean>>(MatDialogRef);
  private readonly port = inject(ElementsDeFabricationPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly libelles = LIBELLES_FORMULAIRE_ELEMENT;
  protected readonly titre = titrePour(this.data);
  protected readonly creation = this.data.element === null;
  protected readonly formulaire = signal(formulairePour(this.data));
  protected readonly soumis = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly erreurTechnique = signal(false);

  protected changeCategorie(code: string): void {
    this.formulaire.update(formulaire => formulaire.avecCategorie(code));
  }

  protected changeReference(reference: string): void {
    this.formulaire.update(formulaire => formulaire.avecReference(reference));
  }

  protected changeLibelle(libelle: string): void {
    this.formulaire.update(formulaire => formulaire.avecLibelle(libelle));
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

  private execute(commande: CommandeElement): Promise<Result<void, RefusDeCommande>> {
    return commande.kind === 'MODIFICATION' ? this.port.modifier(commande) : this.port.creer(commande);
  }
}
