import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TextField } from '@/gestion/shared/design-system/infrastructure/primary/text-field/TextField';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommandePoste, FormulairePosteDeTravail } from '../../../domain/FormulairePosteDeTravail';
import { NatureChoisie } from '../../../domain/NatureChoisie';
import { NatureGeree } from '../../../domain/NatureGeree';
import { NatureInconnue } from '../../../domain/NatureInconnue';
import { NaturesDeTravailPort } from '../../../domain/NaturesDeTravailPort';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { PostesPort } from '../../../domain/PostesPort';
import { RefusModificationPoste } from '../../../domain/RefusModificationPoste';

export interface PosteFormDialogData {
  readonly poste: PosteDeTravail | null;
  readonly nature?: NatureChoisie;
}

@Component({
  selector: 'glm-poste-form-dialog',
  templateUrl: './PosteFormDialog.html',
  styleUrls: ['../../../../../shared/design-system/infrastructure/primary/forms.css', './PosteFormDialog.css'],
  imports: [TextField, MatDialogModule, MatButtonModule, MatAutocompleteModule],
})
export class PosteFormDialog implements OnInit {
  private readonly data = inject<PosteFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialog = inject<MatDialogRef<PosteFormDialog, boolean>>(MatDialogRef);
  private readonly port = inject(PostesPort);
  private readonly naturesPort = inject(NaturesDeTravailPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly formulaire = signal(
    this.data.poste === null
      ? FormulairePosteDeTravail.pourCreation(this.data.nature)
      : FormulairePosteDeTravail.pourModification(this.data.poste),
  );
  protected readonly titre = this.formulaire().id === undefined ? 'Nouveau poste' : 'Modifier le poste';
  protected readonly soumis = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly erreurTechnique = signal(false);
  protected readonly natures = signal<readonly NatureGeree[]>([]);
  protected readonly suggestions = computed(() => {
    const saisie = this.formulaire().saisie.nature;
    return this.natures().filter(nature => nature.libelle.correspondA(saisie));
  });

  ngOnInit(): void {
    this.chargerNatures();
  }

  private chargerNatures(): void {
    this.errors.observe(
      this.naturesPort.natures().then(natures => {
        this.natures.set(natures);
      }),
    );
  }

  protected choisirNature(nature: NatureGeree): void {
    this.formulaire.update(formulaire => formulaire.choisirNature(nature));
  }

  protected changeLibelle(libelle: string): void {
    this.formulaire.update(formulaire => formulaire.avecLibelle(libelle));
  }

  protected readonly libelleDe = (nature: NatureGeree): string => nature.libelle.value;

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
        this.dialog.close(true);
      } else {
        this.formulaire.update(formulaire => formulaire.avecRefus(resultat.error));
        this.relireNaturesApres(resultat.error);
      }
    } catch (failure) {
      this.erreurTechnique.set(true);
      this.errors.handleError(failure);
    } finally {
      this.enregistrement.set(false);
      this.dialog.disableClose = false;
    }
  }

  private relireNaturesApres(refus: RefusModificationPoste): void {
    if (refus instanceof NatureInconnue) {
      this.chargerNatures();
    }
  }

  private execute(commande: CommandePoste) {
    return commande.type === 'MODIFICATION' ? this.port.modifier(commande) : this.port.creer(commande);
  }
}
