import { Component, computed, inject, input, output, signal } from '@angular/core';
import { convertToParamMap, Params, Router } from '@angular/router';
import { RechercheDeLAnomalieSuivante } from '../../../../../application/RechercheDeLAnomalieSuivante';
import { RegularisationDeLaFin } from '../../../../../application/RegularisationDeLaFin';
import { adresseDeLaDestination, DestinationSuivante } from '../../../../../domain/dossier/AnomalieSuivante';
import { AdresseDossier, DossierAnomalie } from '../../../../../domain/dossier/DossierAnomalie';
import { filtreAnomaliesDemande } from '../../../../../domain/dossier/FiltreAnomaliesDemande';
import { OperateurAnomalie } from '../../../../../domain/dossier/OperateurAnomalie';
import { InstantPointage } from '../../../../../domain/regularisation/InstantPointage';
import { EnTeteDuDossier } from '../../../en-tete-du-dossier/EnTeteDuDossier';
import { instantDeplace } from '../../../frise-dossier/DeplacementDeLaPoignee';
import {
  bornesDuFait,
  DeplacementDemande,
  PlacementDemande,
  placementDuDossier,
  poigneeDuDossier,
} from '../../../frise-dossier/PoigneeDeFrise';
import { LIBELLES_ANOMALIES } from '../../../LibellesAnomalies';
import { PARAMETRE_PLUS_AUCUNE_ANOMALIE } from '../../../liste-anomalies/PlusAucuneAnomalie';
import { heureDe } from '../../../PresentationDossier';
import { operateurDuDossier } from '../../../PresentationIdentites';
import { SectionDeFrise } from '../../../section-de-frise/SectionDeFrise';

@Component({
  selector: 'glm-resolution-de-fin',
  imports: [EnTeteDuDossier, SectionDeFrise],
  templateUrl: './ResolutionDeFin.html',
  styleUrls: ['../../../Boutons.css'],
  providers: [RegularisationDeLaFin, RechercheDeLAnomalieSuivante],
  host: { class: 'block' },
})
export class ResolutionDeFin {
  readonly dossier = input.required<DossierAnomalie>();
  readonly adresse = input.required<AdresseDossier>();
  readonly retour = input.required<Params>();
  readonly now = input.required<Date>();
  readonly operateurs = input<readonly OperateurAnomalie[] | undefined>(undefined);
  readonly relectureDemandee = output();
  private readonly regularisation = inject(RegularisationDeLaFin);
  private readonly recherche = inject(RechercheDeLAnomalieSuivante);
  private readonly router = inject(Router);
  private readonly maintenant = signal(new Date().toISOString());
  private readonly instant = signal('');
  protected readonly libelles = LIBELLES_ANOMALIES.regularisation;
  protected readonly rechercheEnCours = signal(false);
  protected readonly operateur = computed(() => operateurDuDossier(this.dossier(), this.operateurs()));
  protected readonly etat = this.regularisation.etat;
  protected readonly regularisee = computed(() => {
    const etat = this.etat();
    return etat.kind === 'REGULARISEE' ? heureDe(etat.dateDeSurvenue) : undefined;
  });
  protected readonly message = computed(() => {
    const etat = this.etat();
    if (etat.kind === 'REFUSEE') return this.libelles.refus[etat.code];
    return etat.kind === 'ECHEC' ? this.libelles.echec : undefined;
  });
  protected readonly poignee = computed(() =>
    this.regularisee() === undefined ? poigneeDuDossier(this.dossier(), this.instant(), this.maintenant()) : undefined,
  );
  protected readonly placement = computed(() =>
    this.regularisee() === undefined ? placementDuDossier(this.dossier(), this.instant(), this.maintenant()) : undefined,
  );
  protected readonly validable = computed(() => new InstantPointage(this.instant()).isValid() && this.etat().kind !== 'EN_COURS');
  protected readonly libelleDeValider = computed(() =>
    new InstantPointage(this.instant()).isValid()
      ? this.libelles.validerLaFin(heureDe(this.instant()))
      : this.libelles.validerLaFinSansHeure,
  );

  protected deplacer({ demande, poignee }: DeplacementDemande): void {
    this.lireLHorloge();
    this.instant.set(instantDeplace(demande, poignee.instant, bornesDuFait(this.dossier(), this.maintenant())));
  }

  protected placer({ demande }: PlacementDemande): void {
    this.lireLHorloge();
    this.instant.set(instantDeplace(demande, this.maintenant(), bornesDuFait(this.dossier(), this.maintenant())));
  }

  protected async valider(): Promise<void> {
    await this.regularisation.valider(this.adresse(), this.dossier().activite.id, this.instant());
    if (this.etat().kind === 'A_RELIRE') this.relectureDemandee.emit();
  }

  protected async passerALaSuivante(): Promise<void> {
    this.rechercheEnCours.set(true);
    try {
      const filtre = filtreAnomaliesDemande(convertToParamMap(this.retour()));
      await this.aller(await this.recherche.destination(this.adresse(), filtre));
    } finally {
      this.rechercheEnCours.set(false);
    }
  }

  private async aller(destination: DestinationSuivante): Promise<void> {
    const adresse = adresseDeLaDestination(destination);
    if (adresse !== undefined) {
      await this.router.navigate(['/anomalies', adresse.suivi.suivi], {
        queryParams: { ...this.retour(), pointage: adresse.pointage.pointage },
      });
      return;
    }
    const plusAucune = destination.kind === 'PLUS_AUCUNE_ANOMALIE';
    const queryParams = plusAucune ? { ...this.retour(), page: null, [PARAMETRE_PLUS_AUCUNE_ANOMALIE]: '1' } : this.retour();
    await this.router.navigate(['/anomalies'], { queryParams });
  }

  private lireLHorloge(): void {
    this.maintenant.set(new Date().toISOString());
  }
}
