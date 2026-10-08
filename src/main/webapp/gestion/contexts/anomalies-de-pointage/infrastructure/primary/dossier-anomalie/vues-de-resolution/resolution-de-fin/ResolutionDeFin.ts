import { DateTimeField, DateTimeFieldLabels } from '@/gestion/shared/design-system/infrastructure/primary/date-time-field/DateTimeField';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { PreparationActe } from '../../../../../application/PreparationActe';
import { CadreDuFait } from '../../../../../domain/acte/CadreDuFait';
import { InstantPointage } from '../../../../../domain/acte/InstantPointage';
import { ChangementSaisie } from '../../../../../domain/acte/SaisieActe';
import { ActiviteAnomalie, ChoixGuide, DossierAnomalie } from '../../../../../domain/dossier/DossierAnomalie';
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
import { erreursALire, heureDe } from '../../../PresentationDossier';
import { operateurDuDossier } from '../../../PresentationIdentites';
import { resumeDeLApercu } from '../../../ResumeDeLApercu';
import { SectionDeFrise } from '../../../section-de-frise/SectionDeFrise';
import { StatutDeLOperation } from '../../../statut-de-l-operation/StatutDeLOperation';
import { LectureDuDossier } from '../LectureDuDossier';

export interface VarianteDeResolution {
  readonly champ: DateTimeFieldLabels;
  readonly validerA: (heure: string) => string;
  readonly validerSansHeure: string;
  readonly motif?: string;
  readonly activiteOuverte?: (choix: ChoixGuide) => string;
}

@Component({
  selector: 'glm-resolution-de-fin',
  imports: [RouterLink, EnTeteDuDossier, SectionDeFrise, StatutDeLOperation, DateTimeField, ComparaisonDesJournaux],
  templateUrl: './ResolutionDeFin.html',
  styleUrls: ['../../../Boutons.css'],
  providers: [ApercuAutomatique],
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
  protected readonly enregistre = computed(() => this.operation().kind === 'APPLIQUE');
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
  protected readonly echec = computed(() => this.operation().kind === 'ERREUR');
  protected readonly libellesDesErreurs = LIBELLES_ANOMALIES.erreurs;

  ngOnInit(): void {
    this.lireLHorloge();
    this.preparation.choose(this.choix().saisie);
    const motif = this.variante().motif;
    if (motif !== undefined) this.changer({ motif });
    if (new InstantPointage(this.instant()).isValid()) void this.apercuAutomatique.lancer(this.dossier(), this.relire);
  }

  protected saisirLInstant(instant: string): void {
    this.lireLHorloge();
    this.changer({ fait: { instant } });
    this.apercuAutomatique.apresFrappe(this.dossier(), this.relire);
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
