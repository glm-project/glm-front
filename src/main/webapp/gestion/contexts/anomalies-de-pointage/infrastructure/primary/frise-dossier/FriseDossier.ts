import { Component, computed, input, output } from '@angular/core';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { memeSelection, SelectionDuDossier } from '../SelectionDuDossier';
import { dispositionDeFrise, VueDeFrise } from './DispositionFrise';

@Component({
  selector: 'glm-frise-dossier',
  templateUrl: './FriseDossier.html',
  styleUrl: './FriseDossier.css',
})
export class FriseDossier {
  readonly dossier = input.required<VueDeFrise>();
  readonly now = input.required<Date>();
  readonly selection = input<SelectionDuDossier | undefined>(undefined);
  readonly selectionDemandee = output<SelectionDuDossier>();
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly estSelectionne = (selection: SelectionDuDossier): boolean => memeSelection(selection, this.selection());
  protected readonly disposition = computed(() => dispositionDeFrise(this.dossier(), this.now()));
}
