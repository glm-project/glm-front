import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { Component, computed, ElementRef, input, output, viewChild, viewChildren } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../../../domain/journee/ActiviteDeLaJourneeId';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';
import { lignesDesActivites } from './LignesDesActivites';

@Component({
  selector: 'glm-activites-du-jour',
  imports: [Icon, MatButtonModule, RouterLink],
  templateUrl: './ActivitesDuJour.html',
  styleUrl: './ActivitesDuJour.css',
})
export class ActivitesDuJour {
  readonly journee = input.required<JourneeACorriger>();
  readonly selection = input<ActiviteDeLaJourneeId>();
  readonly envoiEnCours = input(false);
  readonly ajoutOuvert = input(false);
  readonly ajoutDemande = output();
  readonly retraitDemande = output<ActiviteTerminee>();
  readonly changementDePosteDemande = output<ActiviteTerminee>();
  private readonly boutonDAjout = viewChild.required<unknown, ElementRef<HTMLButtonElement>>('ajouter', { read: ElementRef });
  private readonly boutonsDeChangement = viewChildren<unknown, ElementRef<HTMLButtonElement>>('changerLePoste', { read: ElementRef });
  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.activites;
  protected readonly libelleDeLAjout = LIBELLES_CORRECTION_DES_ACTIVITES.ajout.bouton;
  protected readonly operateur = computed(() => this.journee().operateur.id.value);
  protected readonly lignes = computed(() => lignesDesActivites(this.journee()));

  donnerLeFocusAuBoutonDAjout(): void {
    this.boutonDAjout().nativeElement.focus();
  }

  donnerLeFocusAuChangementDePoste(activite: ActiviteDeLaJourneeId): void {
    this.boutonsDeChangement()
      .find(candidat => candidat.nativeElement.dataset['activite'] === activite.value)
      ?.nativeElement.focus();
  }
}
