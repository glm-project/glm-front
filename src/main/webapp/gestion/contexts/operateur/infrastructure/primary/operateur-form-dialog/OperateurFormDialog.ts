import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommandeOperateur, FormulaireOperateur } from '../../../domain/FormulaireOperateur';
import { Operateur } from '../../../domain/Operateur';
import { OperateursPort } from '../../../domain/OperateursPort';
import { PosteHabilitable } from '../../../domain/PosteHabilitable';

export interface OperateurFormDialogData {
  readonly operateur: Operateur | null;
}

@Component({
  selector: 'glm-operateur-form-dialog',
  templateUrl: './OperateurFormDialog.html',
  styleUrl: './OperateurFormDialog.css',
  imports: [Icon, MatDialogModule, MatButtonModule, MatAutocompleteModule, MatChipsModule],
})
export class OperateurFormDialog implements OnInit {
  private readonly data = inject<OperateurFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialog = inject<MatDialogRef<OperateurFormDialog, boolean>>(MatDialogRef);
  private readonly port = inject(OperateursPort);
  private readonly errors = inject(ErrorHandlerPort);

  protected readonly formulaire = signal(
    this.data.operateur === null ? FormulaireOperateur.pourCreation() : FormulaireOperateur.pourModification(this.data.operateur),
  );
  protected readonly titre = this.formulaire().id === undefined ? 'Nouvel opérateur' : 'Modifier l’opérateur';
  protected readonly soumis = signal(false);
  protected readonly enregistrement = signal(false);
  protected readonly erreurTechnique = signal(false);
  protected readonly recherche = signal('');
  protected readonly catalogue = signal<readonly PosteHabilitable[]>([]);
  protected readonly suggestions = computed(() => {
    const terme = this.recherche();
    const formulaire = this.formulaire();
    return this.catalogue().filter(poste => !formulaire.estDejaHabilite(poste.id) && poste.correspondA(terme));
  });

  ngOnInit(): void {
    this.errors.observe(
      this.port.postesHabilitables().then(postes => {
        this.catalogue.set(postes);
      }),
    );
  }

  protected changeNom(nom: string): void {
    this.formulaire.update(formulaire => formulaire.avecNom(nom));
  }

  protected changePrenom(prenom: string): void {
    this.formulaire.update(formulaire => formulaire.avecPrenom(prenom));
  }

  protected changeMatricule(matricule: string): void {
    this.formulaire.update(formulaire => formulaire.avecMatricule(matricule));
  }

  protected changeTauxHoraire(tauxHoraire: string): void {
    this.formulaire.update(formulaire => formulaire.avecTauxHoraire(tauxHoraire));
  }

  protected chercher(recherche: string): void {
    this.recherche.set(recherche);
  }

  protected ajouterPoste(poste: PosteHabilitable): void {
    this.formulaire.update(formulaire => formulaire.avecPosteAjoute(poste));
    this.recherche.set('');
  }

  protected retirerPoste(poste: PosteHabilitable): void {
    this.formulaire.update(formulaire => formulaire.avecPosteRetire(poste.id));
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

  private execute(commande: CommandeOperateur) {
    return commande.type === 'MODIFICATION' ? this.port.modifier(commande) : this.port.creer(commande);
  }
}
