import { Component, computed, input } from '@angular/core';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';
import { friseDuJour } from './ProjectionDeLaFrise';

@Component({
  selector: 'glm-frise-du-jour',
  templateUrl: './FriseDuJour.html',
  styleUrl: './FriseDuJour.css',
})
export class FriseDuJour {
  readonly journee = input.required<JourneeACorriger>();
  protected readonly libelles = LIBELLES_CORRECTION_DES_ACTIVITES.frise;
  protected readonly frise = computed(() => friseDuJour(this.journee()));
}
