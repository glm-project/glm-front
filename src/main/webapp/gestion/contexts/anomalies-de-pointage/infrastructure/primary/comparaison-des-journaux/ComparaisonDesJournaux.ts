import { Component, input } from '@angular/core';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { ChronologiePointagesPipe } from '../chronologie-pointages/ChronologiePointagesPipe';
import { DetailDuPointage } from '../detail-du-pointage/DetailDuPointage';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { detailDuPointage, remplacementDe } from '../PresentationDossier';

@Component({
  selector: 'glm-comparaison-des-journaux',
  imports: [ChronologiePointagesPipe, DetailDuPointage],
  templateUrl: './ComparaisonDesJournaux.html',
  styleUrl: './ComparaisonDesJournaux.css',
  host: { class: 'block' },
})
export class ComparaisonDesJournaux {
  readonly avant = input.required<DossierAnomalie>();
  readonly apres = input.required<DossierAnomalie>();
  readonly now = input.required<Date>();
  readonly avecMotif = input(true);
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly remplacementDe = remplacementDe;
  protected readonly detailDuPointage = detailDuPointage;
}
