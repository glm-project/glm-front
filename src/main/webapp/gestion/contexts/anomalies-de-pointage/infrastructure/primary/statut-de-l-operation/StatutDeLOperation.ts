import { Component, input, output } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { EtatPreparationActe } from '../../../application/PreparationActe';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { IssueDeLActe } from '../../../domain/dossier/IssueDeLActe';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';

@Component({
  selector: 'glm-statut-de-l-operation',
  imports: [RouterLink],
  templateUrl: './StatutDeLOperation.html',
  styleUrl: '../Boutons.css',
  host: { class: 'contents' },
})
export class StatutDeLOperation {
  readonly operation = input.required<EtatPreparationActe>();
  readonly retour = input.required<Params>();
  readonly verificationDemandee = output();
  readonly repriseDemandee = output();
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly issueDe = (origine: DossierAnomalie, apres: DossierAnomalie) => IssueDeLActe.depuis(origine, apres);
}
