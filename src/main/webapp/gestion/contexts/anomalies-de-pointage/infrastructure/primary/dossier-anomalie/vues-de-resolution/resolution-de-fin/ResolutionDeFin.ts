import { Component, computed, input, signal } from '@angular/core';
import { DossierAnomalie } from '../../../../../domain/dossier/DossierAnomalie';
import { OperateurAnomalie } from '../../../../../domain/dossier/OperateurAnomalie';
import { EnTeteDuDossier } from '../../../en-tete-du-dossier/EnTeteDuDossier';
import { instantDeplace } from '../../../frise-dossier/DeplacementDeLaPoignee';
import {
  bornesDuFait,
  DeplacementDemande,
  PlacementDemande,
  placementDuDossier,
  poigneeDuDossier,
} from '../../../frise-dossier/PoigneeDeFrise';
import { operateurDuDossier } from '../../../PresentationIdentites';
import { SectionDeFrise } from '../../../section-de-frise/SectionDeFrise';

@Component({
  selector: 'glm-resolution-de-fin',
  imports: [EnTeteDuDossier, SectionDeFrise],
  templateUrl: './ResolutionDeFin.html',
  host: { class: 'block' },
})
export class ResolutionDeFin {
  readonly dossier = input.required<DossierAnomalie>();
  readonly now = input.required<Date>();
  readonly operateurs = input<readonly OperateurAnomalie[] | undefined>(undefined);
  private readonly maintenant = signal(new Date().toISOString());
  private readonly instant = signal('');
  protected readonly operateur = computed(() => operateurDuDossier(this.dossier(), this.operateurs()));
  protected readonly poignee = computed(() => poigneeDuDossier(this.dossier(), this.instant(), this.maintenant()));
  protected readonly placement = computed(() => placementDuDossier(this.dossier(), this.instant(), this.maintenant()));

  protected deplacer({ demande, poignee }: DeplacementDemande): void {
    this.lireLHorloge();
    this.instant.set(instantDeplace(demande, poignee.instant, bornesDuFait(this.dossier(), this.maintenant())));
  }

  protected placer({ demande }: PlacementDemande): void {
    this.lireLHorloge();
    this.instant.set(instantDeplace(demande, this.maintenant(), bornesDuFait(this.dossier(), this.maintenant())));
  }

  private lireLHorloge(): void {
    this.maintenant.set(new Date().toISOString());
  }
}
