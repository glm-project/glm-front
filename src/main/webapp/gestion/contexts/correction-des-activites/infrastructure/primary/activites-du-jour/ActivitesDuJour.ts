import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
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
  readonly retraitDemande = output<ActiviteTerminee>();
  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.activites;
  protected readonly operateur = computed(() => this.journee().operateur.id.value);
  protected readonly lignes = computed(() => lignesDesActivites(this.journee()));
}
