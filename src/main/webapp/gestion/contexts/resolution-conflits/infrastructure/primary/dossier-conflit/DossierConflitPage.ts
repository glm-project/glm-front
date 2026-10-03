import { afterNextRender, Component, computed, ElementRef, inject, Injector, resource, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PreparationActe } from '../../../application/PreparationActe';
import { IntentionPointage, TypePointage } from '../../../domain/acte/ActeResolution';
import { ChangementSaisie, SaisieActe } from '../../../domain/acte/SaisieActe';
import { adresseDossier } from '../../../domain/dossier/AdresseDossier';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from '../../../domain/dossier/ConflitsRightsPort';
import { AdresseDossier, DossierConflit, PointageConflit } from '../../../domain/dossier/DossierConflit';
import { LIBELLES_CONFLITS } from '../LibellesConflits';
import { ChronologiePointagesPipe } from '../chronologie-pointages/ChronologiePointagesPipe';
import { DemonstrationConflits } from '../demonstration-conflits/DemonstrationConflits';

@Component({
  selector: 'glm-dossier-conflit',
  templateUrl: './DossierConflitPage.html',
  styleUrl: './DossierConflitPage.css',
  imports: [RouterLink, DemonstrationConflits, ChronologiePointagesPipe],
  providers: [PreparationActe],
})
export class DossierConflitPage {
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly apercuHeading = viewChild<ElementRef<HTMLHeadingElement>>('apercuHeading');
  private readonly port = inject(ConflitsReadPort);
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });
  private readonly parametres = toSignal(this.route.queryParamMap, { requireSync: true });
  private precedente: AdresseDossier | undefined;
  private verificationDemandee = false;
  private demandeLecture = Symbol('lecture');
  protected readonly preparation = inject(PreparationActe);
  protected readonly droits = inject(ConflitsRightsPort);
  protected readonly libelles = LIBELLES_CONFLITS;
  protected readonly detail = signal(false);
  protected readonly choixSelectionne = signal<string | undefined>(undefined);
  protected readonly types: readonly TypePointage[] = ['DEBUT', 'NON_CONFORMITE', 'FIN'];
  protected readonly intentions: readonly IntentionPointage[] = ['OUVERTURE', 'TRANSITION', 'FIN'];
  protected readonly adresse = computed(() => adresseDossier(this.chemin().get('suivi'), this.parametres().get('pointage')));
  protected readonly retour = computed(() => ({
    operateur: this.parametres().get('operateur'),
    element: this.parametres().get('element'),
    page: this.parametres().get('page'),
  }));
  protected readonly lecture = resource({ params: () => ({ adresse: this.adresse() }), loader: ({ params }) => this.read(params.adresse) });
  protected readonly resultatLecture = computed(() => (this.lecture.error() ? undefined : this.lecture.value()));
  protected readonly dossier = computed(() => {
    if (this.lecture.isLoading()) return undefined;
    const lecture = this.resultatLecture();
    return lecture?.kind === 'DOSSIER' ? lecture.dossier : undefined;
  });
  protected readonly proposition = computed(() => this.preparation.resolution().saisie.proposition);
  protected readonly choixAffiche = computed(() => (this.proposition() === undefined ? undefined : this.choixSelectionne()));
  protected readonly apercu = computed(() => this.preparation.resolution().apercu);
  protected readonly occupe = computed(() =>
    ['PREVISUALISATION', 'CONFIRMATION', 'ISSUE_INCONNUE'].includes(this.preparation.operation().kind),
  );

  private async read(adresse: AdresseDossier | undefined) {
    const demande = Symbol('lecture');
    this.demandeLecture = demande;
    const verification = this.verificationDemandee;
    this.verificationDemandee = false;
    if (adresse === undefined) {
      this.precedente = undefined;
      this.contextChanged();
      return undefined;
    }
    if (!this.sameAddress(adresse)) this.contextChanged();
    this.precedente = adresse;
    const resultat = await this.port.read(adresse);
    if (this.verificationIsCurrent(verification, adresse, demande)) this.preparation.acknowledgeRead();
    return resultat;
  }

  private verificationIsCurrent(verification: boolean, adresse: AdresseDossier, demande: symbol): boolean {
    return verification && this.demandeLecture === demande && this.sameAddress(adresse);
  }

  private sameAddress(adresse: AdresseDossier): boolean {
    return this.precedente?.suivi.suivi === adresse.suivi.suivi && this.precedente.pointage.pointage === adresse.pointage.pointage;
  }

  private contextChanged(): void {
    this.preparation.contextChanged();
    this.choixSelectionne.set(undefined);
  }

  protected choose(saisie: SaisieActe, choix?: string): void {
    this.preparation.choose(saisie);
    this.detail.set(false);
    this.choixSelectionne.set(choix);
  }

  protected correct(pointage: PointageConflit): void {
    this.choose(SaisieActe.correct(pointage.id.pointage, pointage.fait));
    this.detail.set(true);
  }

  protected regularise(): void {
    this.choose(SaisieActe.regularise());
    this.detail.set(true);
  }

  protected cancel(pointage: PointageConflit): void {
    this.choose(SaisieActe.cancel(pointage.id.pointage));
  }

  protected change(changement: ChangementSaisie): void {
    this.preparation.change(changement);
    if (changement.fait !== undefined) this.choixSelectionne.set(undefined);
  }

  protected async preview(dossier: DossierConflit): Promise<void> {
    await this.preparation.preview(dossier);
    this.refreshAfterConcurrency();
    afterNextRender(() => this.apercuHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  protected async confirm(): Promise<void> {
    await this.preparation.confirm();
    const resultat = this.preparation.operation();
    if (resultat.kind === 'APPLIQUE') {
      this.lecture.value.set({ kind: 'DOSSIER', dossier: resultat.dossier });
    }
    this.refreshAfterConcurrency();
  }

  private refreshAfterConcurrency(): void {
    if (this.preparation.operation().kind === 'CONCURRENCE') this.lecture.reload();
  }

  protected reload(): void {
    this.lecture.reload();
  }

  protected verify(): void {
    this.verificationDemandee = true;
    this.lecture.reload();
  }

  protected reset(): void {
    this.preparation.reset();
    this.choixSelectionne.set(undefined);
    this.lecture.reload();
  }
}
