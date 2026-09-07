import { Component, output } from '@angular/core';
import { LIBELLES_REINITIALISATION } from '../LibellesEnrolement';

@Component({
  selector: 'glm-reinitialisation',
  host: { 'data-selector': 'reinitialisation' },
  templateUrl: './reinitialisation.html',
  styleUrl: './reinitialisation.css',
})
export class Reinitialisation {
  protected readonly labels = LIBELLES_REINITIALISATION;
  readonly annule = output();
  readonly confirme = output();
}
