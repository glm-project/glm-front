import { afterNextRender, Component, computed, ElementRef, inject, Injector, resource, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PreparationActe } from '../../../application/PreparationActe';
import { IntentionPointage, TypePointage } from '../../../domain/acte/ActeResolution';
import { ChangementSaisie, SaisieActe } from '../../../domain/acte/SaisieActe';
import { adresseDossier } from '../../../domain/dossier/AdresseDossier';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from '../../../domain/dossier/ConflitsRightsPort';
import {
  ActiviteConflit,
  AdresseDossier,
  ChoixGuide,
  DossierConflit,
  LigneConflit,
  PointageConflit,
} from '../../../domain/dossier/DossierConflit';
import { PointageConflitId } from '../../../domain/dossier/PointageConflitId';
import { LIBELLES_CONFLITS } from '../LibellesConflits';
import { ChronologiePointagesPipe } from '../chronologie-pointages/ChronologiePointagesPipe';

@Component({
  selector: 'glm-dossier-conflit',
  imports: [RouterLink, ChronologiePointagesPipe],
  templateUrl: './DossierConflitPage.html',
  styleUrl: './DossierConflitPage.css',
  providers: [PreparationActe],
})
export class DossierConflitPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly apercuHeading = viewChild<ElementRef<HTMLHeadingElement>>('apercuHeading');
  private readonly propositionHeading = viewChild<ElementRef<HTMLHeadingElement>>('propositionHeading');
  private readonly port = inject(ConflitsReadPort);
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });
  private readonly parametres = toSignal(this.route.queryParamMap, { requireSync: true });
  private precedente: AdresseDossier | undefined;
  protected readonly preparation = inject(PreparationActe);
  protected readonly droits = inject(ConflitsRightsPort);
  protected readonly libelles = LIBELLES_CONFLITS;
  protected readonly detail = signal(false);
  protected readonly choixSelectionne = signal<string | undefined>(undefined);
  protected readonly pointageConsulte = signal<string | undefined>(undefined);
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

  protected libelleActivite(activite: ActiviteConflit): string {
    const periode = activite.periode;
    if (periode === undefined) return activite.libelle;
    const categorie = periode.categorie === 'TRAVAIL' ? this.libelles.types.DEBUT : this.libelles.types.NON_CONFORMITE;
    const fin = periode.fin === undefined ? '' : ` → ${periode.fin}`;
    return `${categorie} · ${periode.debut}${fin}`;
  }

  protected libelleChoix(choix: ChoixGuide): string {
    return choix.code === undefined ? choix.libelle : this.libelles.choix[choix.code].libelle;
  }

  protected explicationChoix(choix: ChoixGuide): string {
    return choix.code === undefined ? choix.explication : this.libelles.choix[choix.code].explication;
  }

  protected libelleContinuation(ligne: LigneConflit): string {
    return (
      ligne.explication
      || `${ligne.designation} · ${ligne.operateur || ligne.operateurId} · ${ligne.date} · ${ligne.nombrePointages} pointages`
    );
  }

  protected referencePointage(
    journal: readonly PointageConflit[],
    identifiant: PointageConflitId,
  ): Readonly<{ libelle: string; lien?: string }> {
    const pointage = journal.find(pointage => pointage.id.pointage === identifiant.pointage);
    if (pointage === undefined) return { libelle: identifiant.pointage };
    const fait = pointage.fait;
    return {
      libelle: `${fait.instant} · ${this.libelles.types[fait.type]} · ${this.libelles.intentions[fait.intention]}`,
      lien: this.hrefForRepere(`pointage-${pointage.id.pointage}`),
    };
  }

  private hrefForRepere(repere: string): string {
    return this.router.serializeUrl(
      this.router.createUrlTree([], {
        relativeTo: this.route,
        queryParamsHandling: 'preserve',
        fragment: repere,
      }),
    );
  }

  protected tempsActivite(activite: ActiviteConflit): string {
    if (activite.etat === 'EN_COURS') return 'Temps non définitif';
    if (activite.etat === 'A_RESOUDRE') return activite.temps || 'Temps à résoudre';
    const duree = activite.periode?.duree;
    if (duree === undefined) return activite.temps;
    const composants = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(duree);
    if (composants === null) return duree;
    return [
      composants[1] && `${composants[1]} h`,
      composants[2] && `${composants[2]} min`,
      composants[3] && `${composants[3].replace('.', ',')} s`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private read(adresse: AdresseDossier | undefined) {
    if (adresse === undefined) {
      this.precedente = undefined;
      this.contextChanged();
      return Promise.resolve(undefined);
    }
    if (!this.sameAddress(adresse)) this.contextChanged();
    this.precedente = adresse;
    return this.port.read(adresse);
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
    this.focusHeading(this.propositionHeading);
  }

  protected labelForActivite(id: string, dossier: DossierConflit): string {
    const activite = dossier.activites.find(activite => activite.id.activite === id);
    if (activite !== undefined) return this.libelleActivite(activite);
    const origine = dossier.journal.find(pointage => pointage.activiteCreee?.activite === id);
    if (origine !== undefined) return `${this.libelles.types[origine.fait.type]} à ${origine.fait.instant.slice(11, 19)}`;
    return `Activité ${id}`;
  }

  protected hrefForActivite(id: string, dossier: DossierConflit): string {
    const origine = dossier.journal.find(pointage => pointage.activiteCreee?.activite === id);
    return this.hrefForRepere(origine === undefined ? `activite-${id}` : `pointage-${origine.id.pointage}`);
  }

  protected traceToggled(pointage: string, ouverte: boolean): void {
    const consultationFermee = !ouverte && this.pointageConsulte() === pointage;
    if (consultationFermee) this.pointageConsulte.set(undefined);
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

  protected targetIsAbsent(dossier: DossierConflit, reference: string): boolean {
    return reference !== '' && !dossier.activites.some(activite => activite.id.activite === reference);
  }

  protected async preview(dossier: DossierConflit): Promise<void> {
    await this.preparation.preview(dossier);
    this.refreshAfterConcurrency();
    this.focusHeading(this.apercuHeading);
  }

  private focusHeading(heading: () => ElementRef<HTMLHeadingElement> | undefined): void {
    afterNextRender(() => heading()?.nativeElement.focus(), { injector: this.injector });
  }

  protected async confirm(): Promise<void> {
    await this.preparation.confirm();
    this.refreshAfterConfirmation();
  }

  protected async retryConfirmation(): Promise<void> {
    await this.preparation.retryConfirmation();
    this.refreshAfterConfirmation();
  }

  private refreshAfterConfirmation(): void {
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

  protected async verify(): Promise<void> {
    await this.preparation.verify();
    this.refreshAfterConfirmation();
  }
}
