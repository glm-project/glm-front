import { InstantLongDayPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { Component, input } from '@angular/core';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { phrasesDuProbleme } from '../PhrasesDuProbleme';
import { operateurPresente, postePresente } from '../PresentationIdentites';

@Component({
  selector: 'glm-en-tete-du-dossier',
  imports: [InstantLongDayPipe],
  templateUrl: './EnTeteDuDossier.html',
  host: { class: 'block' },
})
export class EnTeteDuDossier {
  readonly dossier = input.required<DossierAnomalie>();
  readonly now = input.required<Date>();
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly operateurDe = operateurPresente;
  protected readonly posteDe = postePresente;
  protected readonly problemes = phrasesDuProbleme;
}
