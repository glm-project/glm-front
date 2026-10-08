import { Component, input } from '@angular/core';
import { Params } from '@angular/router';
import { ChoixGuide, DossierAnomalie } from '../../../../../domain/dossier/DossierAnomalie';
import { OperateurAnomalie } from '../../../../../domain/dossier/OperateurAnomalie';
import { LIBELLES_ANOMALIES } from '../../../LibellesAnomalies';
import { LectureDuDossier } from '../LectureDuDossier';
import { ResolutionDeFin, VarianteDeResolution } from '../resolution-de-fin/ResolutionDeFin';

@Component({
  selector: 'glm-resolution-regulariser-fin',
  imports: [ResolutionDeFin],
  template: `<glm-resolution-de-fin
    [dossier]="dossier()"
    [choix]="choix()"
    [now]="now()"
    [retour]="retour()"
    [operateurs]="operateurs()"
    [lecture]="lecture()"
    [variante]="variante"
  />`,
  host: { class: 'block' },
})
export class ResolutionRegulariserFin {
  readonly dossier = input.required<DossierAnomalie>();
  readonly choix = input.required<ChoixGuide>();
  readonly now = input.required<Date>();
  readonly retour = input.required<Params>();
  readonly operateurs = input<readonly OperateurAnomalie[] | undefined>(undefined);
  readonly lecture = input.required<LectureDuDossier>();
  protected readonly variante: VarianteDeResolution = {
    validerA: LIBELLES_ANOMALIES.resolution.validerLaFin,
    validerSansHeure: LIBELLES_ANOMALIES.resolution.validerLaFinSansHeure,
  };
}
