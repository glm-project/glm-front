import { Component, output } from '@angular/core';
import { LIBELLES_MES_POINTAGES } from '../LibellesMesPointages';

@Component({
  selector: 'glm-mes-pointages',
  host: { 'data-selector': 'mes-pointages', class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './mes-pointages.html',
})
export class MesPointages {
  readonly retourRequested = output();
  protected readonly labels = LIBELLES_MES_POINTAGES;
}
