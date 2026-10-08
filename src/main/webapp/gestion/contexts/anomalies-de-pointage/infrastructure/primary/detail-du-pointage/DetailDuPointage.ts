import { Component, input } from '@angular/core';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { DetailPointage } from '../PresentationDossier';

@Component({
  selector: 'glm-detail-du-pointage',
  templateUrl: './DetailDuPointage.html',
  host: { class: 'contents' },
})
export class DetailDuPointage {
  readonly detail = input.required<DetailPointage>();
  readonly classeEntete = input.required<string>();
  readonly classeLigne = input.required<string>();
  protected readonly libelles = LIBELLES_ANOMALIES;
}
