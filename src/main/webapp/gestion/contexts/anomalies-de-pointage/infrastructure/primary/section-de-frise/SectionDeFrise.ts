import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { FriseDossier } from '../frise-dossier/FriseDossier';
import { DeplacementDemande, PlacementDeLInstant, PlacementDemande, PoigneeDeFrise } from '../frise-dossier/PoigneeDeFrise';
import { jourDeLaJournee } from '../JourneeDeLOperateur';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';

@Component({
  selector: 'glm-section-de-frise',
  imports: [RouterLink, FriseDossier],
  templateUrl: './SectionDeFrise.html',
  styleUrl: './SectionDeFrise.css',
  host: { class: 'block' },
})
export class SectionDeFrise {
  readonly dossier = input.required<DossierAnomalie>();
  readonly now = input.required<Date>();
  readonly operateur = input<string | undefined>(undefined);
  readonly poignee = input<PoigneeDeFrise | undefined>(undefined);
  readonly placement = input<PlacementDeLInstant | undefined>(undefined);
  readonly deplacementDemande = output<DeplacementDemande>();
  readonly placementDemande = output<PlacementDemande>();
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly jourDeLaJournee = jourDeLaJournee;

  protected libelleDeLaJournee(): string {
    return this.libelles.voirLaJournee(this.operateur() ?? this.libelles.operateurInconnu);
  }
}
