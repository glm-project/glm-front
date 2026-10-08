import { Component, input } from '@angular/core';
import { Params } from '@angular/router';
import { ChoixGuide, DossierAnomalie } from '../../../../../domain/dossier/DossierAnomalie';
import { OperateurAnomalie } from '../../../../../domain/dossier/OperateurAnomalie';
import { LIBELLES_ANOMALIES } from '../../../LibellesAnomalies';
import { LectureDuDossier } from '../LectureDuDossier';
import { ResolutionDeFin, VarianteDeResolution } from '../resolution-de-fin/ResolutionDeFin';

const categorieOuverte = (choix: ChoixGuide): 'NON_CONFORMITE' | 'TRAVAIL' => {
  const proposition = choix.saisie.proposition;
  return proposition?.kind === 'CORRECTION' && proposition.fait.type === 'NON_CONFORMITE' ? 'NON_CONFORMITE' : 'TRAVAIL';
};

@Component({
  selector: 'glm-resolution-corriger-transition-tardive',
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
export class ResolutionCorrigerTransitionTardive {
  readonly dossier = input.required<DossierAnomalie>();
  readonly choix = input.required<ChoixGuide>();
  readonly now = input.required<Date>();
  readonly retour = input.required<Params>();
  readonly operateurs = input<readonly OperateurAnomalie[] | undefined>(undefined);
  readonly lecture = input.required<LectureDuDossier>();
  protected readonly variante: VarianteDeResolution = {
    validerA: LIBELLES_ANOMALIES.resolution.validerLePassage,
    validerSansHeure: LIBELLES_ANOMALIES.resolution.validerLePassageSansHeure,
    motif: LIBELLES_ANOMALIES.resolution.motifs.passageTardif,
    activiteOuverte: choix => LIBELLES_ANOMALIES.resolution.activiteOuverte[categorieOuverte(choix)],
  };
}
