import { InstantLongDayPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LigneConflit } from '../../../domain/dossier/DossierAnomalie';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { operateurPresente } from '../PresentationIdentites';

@Component({
  selector: 'glm-continuations-du-dossier',
  imports: [RouterLink],
  templateUrl: './ContinuationsDuDossier.html',
  styleUrl: '../Boutons.css',
  host: { class: 'contents' },
})
export class ContinuationsDuDossier {
  readonly continuations = input.required<readonly LigneConflit[]>();
  readonly now = input.required<Date>();
  protected readonly libelles = LIBELLES_ANOMALIES;
  private readonly instantLongDay = new InstantLongDayPipe();

  protected libelleContinuation(ligne: LigneConflit): string {
    return (
      ligne.explication
      || `${ligne.designation} · ${operateurPresente(ligne.operateur)} · ${this.instantLongDay.transform(ligne.date, this.now())} · ${ligne.nombrePointages} pointages`
    );
  }
}
