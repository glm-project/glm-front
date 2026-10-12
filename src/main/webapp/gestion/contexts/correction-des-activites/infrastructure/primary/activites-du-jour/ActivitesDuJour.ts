import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';
import { lignesDesActivites } from './LignesDesActivites';

@Component({
  selector: 'glm-activites-du-jour',
  imports: [RouterLink],
  templateUrl: './ActivitesDuJour.html',
  styleUrl: './ActivitesDuJour.css',
})
export class ActivitesDuJour {
  readonly journee = input.required<JourneeACorriger>();
  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.activites;
  protected readonly operateur = computed(() => this.journee().operateur.id.value);
  protected readonly lignes = computed(() => lignesDesActivites(this.journee()));
}
