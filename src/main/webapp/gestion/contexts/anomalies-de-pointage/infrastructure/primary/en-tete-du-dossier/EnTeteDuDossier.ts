import { InstantLongDayPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { Component, input } from '@angular/core';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
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
  protected readonly operateurDe = operateurPresente;
  protected readonly posteDe = postePresente;
  protected readonly problemes = phrasesDuProbleme;
}
