import { InstantLongDayWithSecondsPipe } from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { ApercuAnomalie } from '../../../domain/acte/AnomaliesActesPorts';
import { DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { IssueDeLActe } from '../../../domain/dossier/IssueDeLActe';
import { ReferentielAnomalies } from '../../../domain/dossier/ReferentielAnomalies';
import { ComparaisonDesJournaux } from '../comparaison-des-journaux/ComparaisonDesJournaux';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { labelForActivite, libelleDuGeste, referencePointage } from '../PresentationDossier';
import { operateurDeLActe, posteDeLActe } from '../PresentationIdentites';

@Component({
  selector: 'glm-apercu-de-l-acte',
  imports: [InstantLongDayWithSecondsPipe, ComparaisonDesJournaux],
  templateUrl: './ApercuDeLActe.html',
  styleUrls: ['../Boutons.css', './ApercuDeLActe.css'],
  host: { class: 'block' },
})
export class ApercuDeLActe {
  readonly apercu = input.required<ApercuAnomalie>();
  readonly now = input.required<Date>();
  readonly referentiel = input<ReferentielAnomalies | undefined>(undefined);
  readonly confirmable = input.required<boolean>();
  readonly confirmationDemandee = output();
  private readonly titre = viewChild.required<ElementRef<HTMLHeadingElement>>('titre');
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly issueDe = (origine: DossierAnomalie, apres: DossierAnomalie) => IssueDeLActe.depuis(origine, apres);
  protected readonly libelleDuGeste = libelleDuGeste;
  protected readonly labelForActivite = labelForActivite;

  focusTitre(): void {
    this.titre().nativeElement.focus();
  }

  protected libelleDuPointage(journal: readonly PointageAnomalie[], identifiant: string): string {
    return referencePointage(journal, identifiant, this.now()).libelle;
  }

  protected operateurDeLActe(operateur: string, journal: readonly PointageAnomalie[]): string {
    return operateurDeLActe(operateur, this.referentiel(), journal);
  }

  protected posteDeLActe(poste: string, journal: readonly PointageAnomalie[]): string {
    return posteDeLActe(poste, this.referentiel(), journal);
  }
}
