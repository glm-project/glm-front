import { Component, input, output } from '@angular/core';
import { LIBELLES_RELEVE_DES_HEURES } from '../LibellesReleveDesHeures';
import { JournalDuJour } from './JournalDuJour';

@Component({
  selector: 'glm-journal',
  templateUrl: './Journal.html',
  styleUrl: './Journal.css',
})
export class Journal {
  protected readonly libelles = LIBELLES_RELEVE_DES_HEURES;

  readonly journal = input.required<JournalDuJour>();
  readonly choisi = output<number>();
}
