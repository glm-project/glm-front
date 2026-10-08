import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { convertToParamMap, Params, Router, RouterLink } from '@angular/router';
import { EtatPreparationActe, PreparationActe } from '../../../../../application/PreparationActe';
import { RechercheDeLAnomalieSuivante } from '../../../../../application/RechercheDeLAnomalieSuivante';
import { CadreDuFait } from '../../../../../domain/acte/CadreDuFait';
import { InstantPointage } from '../../../../../domain/acte/InstantPointage';
import { ChangementSaisie } from '../../../../../domain/acte/SaisieActe';
import { adresseDeLaDestination, DestinationSuivante } from '../../../../../domain/dossier/AnomalieSuivante';
import { ActiviteAnomalie, ChoixGuide, DossierAnomalie } from '../../../../../domain/dossier/DossierAnomalie';
import { filtreAnomaliesDemande } from '../../../../../domain/dossier/FiltreAnomaliesDemande';
import { IssueDeLActe } from '../../../../../domain/dossier/IssueDeLActe';
import { ReferentielAnomalies } from '../../../../../domain/dossier/ReferentielAnomalies';
import { ApercuAutomatique } from '../../../apercu-automatique/ApercuAutomatique';
import { ComparaisonDesJournaux } from '../../../comparaison-des-journaux/ComparaisonDesJournaux';
import { EnTeteDuDossier } from '../../../en-tete-du-dossier/EnTeteDuDossier';
import { instantDeplace } from '../../../frise-dossier/DeplacementDeLaPoignee';
import {
  bornesDuDeplacement,
  DeplacementDemande,
  PlacementDemande,
  placementDuDossier,
  poigneeDuDossier,
} from '../../../frise-dossier/PoigneeDeFrise';
import { LIBELLES_ANOMALIES } from '../../../LibellesAnomalies';
import { PARAMETRE_PLUS_AUCUNE_ANOMALIE } from '../../../liste-anomalies/PlusAucuneAnomalie';
import { erreursALire, heureDe } from '../../../PresentationDossier';
import { operateurDuDossier } from '../../../PresentationIdentites';
import { resumeDeLApercu } from '../../../ResumeDeLApercu';
import { SectionDeFrise } from '../../../section-de-frise/SectionDeFrise';
import { StatutDeLOperation } from '../../../statut-de-l-operation/StatutDeLOperation';
import { LectureDuDossier } from '../LectureDuDossier';

type RecuDeLActe = Extract<EtatPreparationActe, { readonly kind: 'APPLIQUE' }>;

export interface VarianteDeResolution {
  readonly validerA: (heure: string) => string;
  readonly validerSansHeure: string;
  readonly motif?: string;
  readonly activiteOuverte?: (choix: ChoixGuide) => string;
}

@Component({
  selector: 'glm-resolution-de-fin',
  imports: [RouterLink, EnTeteDuDossier, SectionDeFrise, StatutDeLOperation, ComparaisonDesJournaux],
  templateUrl: './ResolutionDeFin.html',
  styleUrls: ['../../../Boutons.css'],
  providers: [ApercuAutomatique, RechercheDeLAnomalieSuivante],
  host: { class: 'block' },
})
export class ResolutionDeFin implements OnInit {
  readonly dossier = input.required<DossierAnomalie>();
  readonly choix = input.required<ChoixGuide>();
  readonly now = input.required<Date>();
  readonly retour = input.required<Params>();
  readonly referentiel = input<ReferentielAnomalies | undefined>(undefined);
  protected readonly preparation = inject(PreparationActe);
  private readonly apercuAutomatique = inject(ApercuAutomatique);
  private readonly recherche = inject(RechercheDeLAnomalieSuivante);
  private readonly router = inject(Router);
  readonly lecture = input.required<LectureDuDossier>();
  protected readonly libelles = LIBELLES_ANOMALIES.resolution;
  readonly variante = input.required<VarianteDeResolution>();
  private readonly relire = (): Promise<DossierAnomalie | undefined> => this.lecture().relire(this.dossier().ligne.adresse);
  private readonly maintenant = signal(new Date().toISOString());
  private readonly saisie = computed(() => this.preparation.resolution().saisie);
  protected readonly apercu = computed(() => this.preparation.resolution().apercu);
  protected readonly operation = this.preparation.operation;
  protected readonly occupe = computed(() => ['CONFIRMATION', 'ISSUE_INCONNUE'].includes(this.operation().kind));
  protected readonly verification = computed(() => this.operation().kind === 'APERCU_EN_ARRIERE_PLAN');
  protected readonly validable = computed(
    () => this.operation().kind === 'REPOS' && this.preparation.resolution().confirmation() !== undefined,
  );
  protected readonly recu = computed(() => {
    const operation = this.operation();
    return operation.kind === 'APPLIQUE' ? operation : undefined;
  });
  protected readonly enregistre = computed(() => this.recu() !== undefined);
  protected readonly instant = computed(() => this.saisie().instantDuFait());
  protected readonly resume = resumeDeLApercu;
  protected readonly operateur = computed(() => operateurDuDossier(this.dossier(), this.referentiel()));
  private readonly cadre = computed(() => CadreDuFait.depuis(this.dossier().activites, this.maintenant()));
  protected readonly erreurs = computed(() =>
    erreursALire(
      this.saisie()
        .errors(this.cadre())
        .filter(erreur => erreur !== 'INSTANT_INVALIDE'),
    ),
  );
  protected readonly poignee = computed(() =>
    this.enregistre() ? undefined : poigneeDuDossier(this.dossier(), this.saisie().proposition, this.maintenant(), this.occupe()),
  );
  protected readonly placement = computed(() =>
    this.enregistre() ? undefined : placementDuDossier(this.dossier(), this.saisie().proposition, this.maintenant(), this.occupe()),
  );
  protected readonly libelleDeValider = computed(() =>
    new InstantPointage(this.instant()).isValid() ? this.variante().validerA(heureDe(this.instant())) : this.variante().validerSansHeure,
  );
  protected readonly autresFinsAutomatiques = computed(() =>
    this.dossier().activites.filter(activite => this.estUneAutreFinAutomatique(activite)),
  );
  protected readonly autreFinAutomatique = computed(() => this.autresFinsAutomatiques()[0]);
  protected readonly activiteOuverte = computed(() => this.variante().activiteOuverte?.(this.choix()));
  protected readonly rechercheEnCours = signal(false);
  protected readonly echec = computed(() => this.operation().kind === 'ERREUR');
  protected readonly libellesDesErreurs = LIBELLES_ANOMALIES.erreurs;

  ngOnInit(): void {
    this.lireLHorloge();
    this.preparation.choose(this.choix().saisie);
    const motif = this.variante().motif;
    if (motif !== undefined) this.changer({ motif });
    if (new InstantPointage(this.instant()).isValid()) void this.apercuAutomatique.lancer(this.dossier(), this.relire);
  }

  protected deplacer({ demande, poignee }: DeplacementDemande): void {
    this.lireLHorloge();
    const instant = instantDeplace(demande, poignee.instant, bornesDuDeplacement(this.cadre(), this.dossier(), poignee));
    if (demande.kind === 'VERS') this.apercuAutomatique.annuler();
    this.changer({ fait: { instant } });
    if (demande.kind !== 'VERS') this.apercuAutomatique.apresFrappe(this.dossier(), this.relire);
  }

  protected placer({ instant, placement }: PlacementDemande): void {
    this.lireLHorloge();
    this.changer({
      fait: {
        instant: instantDeplace({ kind: 'VERS', instant }, this.maintenant(), bornesDuDeplacement(this.cadre(), this.dossier(), placement)),
      },
    });
    this.apercuAutomatique.apresFrappe(this.dossier(), this.relire);
  }

  protected relacher(): void {
    if (this.apercu() === undefined) void this.apercuAutomatique.lancer(this.dossier(), this.relire);
  }

  protected reessayer(): void {
    void this.apercuAutomatique.lancer(this.dossier(), this.relire);
  }

  protected async valider(): Promise<void> {
    this.apercuAutomatique.annuler();
    await this.preparation.confirm();
    await this.apresConfirmation();
  }

  protected async verifier(): Promise<void> {
    await this.preparation.verify();
    await this.apresConfirmation();
  }

  protected async reprendre(): Promise<void> {
    await this.preparation.retryConfirmation();
    await this.apresConfirmation();
  }

  protected async passerALaSuivante(recu: RecuDeLActe): Promise<void> {
    this.rechercheEnCours.set(true);
    try {
      const issue = IssueDeLActe.depuis(recu.origine, recu.dossier);
      const filtre = filtreAnomaliesDemande(convertToParamMap(this.retour()));
      await this.aller(await this.recherche.destination(issue, recu.origine.ligne.adresse, filtre));
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

  private async apresConfirmation(): Promise<void> {
    const operation = this.preparation.operation();
    if (operation.kind === 'APPLIQUE') this.lecture().remplacerPar(operation.dossier);
    if (operation.kind === 'CONCURRENCE') await this.relancerSurLeDossierRelu();
  }

  private async relancerSurLeDossierRelu(): Promise<void> {
    const relu = await this.relire();
    if (relu !== undefined) await this.apercuAutomatique.lancer(relu, this.relire);
  }

  private estUneAutreFinAutomatique(activite: ActiviteAnomalie): boolean {
    return activite.etat === 'ECHUE' && !activite.ouvrant.equals(this.dossier().ligne.adresse.pointage);
  }

  private changer(changement: ChangementSaisie): void {
    this.preparation.change(changement);
  }

  private lireLHorloge(): void {
    this.maintenant.set(new Date().toISOString());
  }
}
