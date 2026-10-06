import {
  InstantDatetimePipe,
  InstantLongDayPipe,
  InstantLongDayWithSecondsPipe,
  InstantTimeAndLongDayWithSecondsPipe,
} from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { provideGestionDateAdapter } from '@/gestion/shared/design-system/infrastructure/primary/date-adapter/gestion-date.provider';
import { DateTimeField } from '@/gestion/shared/design-system/infrastructure/primary/date-time-field/DateTimeField';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PreparationActe } from '../../../application/PreparationActe';
import { IntentionPointage, TypePointage } from '../../../domain/acte/ActeResolution';
import { CadreDuFait } from '../../../domain/acte/CadreDuFait';
import { ChangementSaisie, SaisieActe } from '../../../domain/acte/SaisieActe';
import { adresseDossier } from '../../../domain/dossier/AdresseDossier';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import { AnomaliesRightsPort } from '../../../domain/dossier/AnomaliesRightsPort';
import { AdresseDossier, ChoixGuide, DossierAnomalie, LigneConflit, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { IssueDeLAnomalie } from '../../../domain/dossier/IssueDeLAnomalie';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { PosteAnomalieId } from '../../../domain/dossier/PosteAnomalieId';
import { ReferentielAnomalies } from '../../../domain/dossier/ReferentielAnomalies';
import { etatDeLecture } from '../EtatDeLecture';
import { pointagesTardifs } from '../GestesTardifs';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import { phrasesDuProbleme } from '../PhrasesDuProbleme';
import {
  detailDuPointage,
  intituleDeLActivite,
  labelForActivite,
  libelleActivite,
  libelleDuGeste,
  referencePointage,
  remplacementDe,
  selectionInitiale,
  tempsActivite,
} from '../PresentationDossier';
import { operateurDeLActe, operateurPresente, posteDeLActe, postePresente } from '../PresentationIdentites';
import { SelectionDuDossier } from '../SelectionDuDossier';
import { ChronologiePointagesPipe } from '../chronologie-pointages/ChronologiePointagesPipe';
import { instantDeplace, peutDeplacer } from '../frise-dossier/DeplacementDeLaPoignee';
import { FriseDossier } from '../frise-dossier/FriseDossier';
import { DeplacementDemande, PlacementDemande, placementDuDossier, poigneeDuDossier } from '../frise-dossier/PoigneeDeFrise';
import { SelecteurOperateurAnomalie } from '../selecteur-operateur/SelecteurOperateurAnomalie';

const REFERENTIEL_VIDE = new ReferentielAnomalies([], []);

@Component({
  selector: 'glm-dossier-anomalie',
  imports: [
    RouterLink,
    ChronologiePointagesPipe,
    InstantDatetimePipe,
    InstantLongDayPipe,
    InstantLongDayWithSecondsPipe,
    InstantTimeAndLongDayWithSecondsPipe,
    DateTimeField,
    SelecteurOperateurAnomalie,
    NgTemplateOutlet,
    FriseDossier,
  ],
  templateUrl: './DossierAnomaliePage.html',
  styleUrl: './DossierAnomaliePage.css',
  providers: [PreparationActe, ...provideGestionDateAdapter()],
})
export class DossierAnomaliePage {
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly apercuHeading = viewChild<ElementRef<HTMLHeadingElement>>('apercuHeading');
  private readonly propositionHeading = viewChild<ElementRef<HTMLHeadingElement>>('propositionHeading');
  private readonly port = inject(AnomaliesReadPort);
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });
  private readonly parametres = toSignal(this.route.queryParamMap, { requireSync: true });
  private readonly instantLongDay = new InstantLongDayPipe();
  private precedente: AdresseDossier | undefined;
  protected readonly now = new Date();
  protected readonly preparation = inject(PreparationActe);
  protected readonly droits = inject(AnomaliesRightsPort);
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly operateurDe = operateurPresente;
  protected readonly posteDe = postePresente;
  protected readonly origine = signal<DossierAnomalie | undefined>(undefined);
  protected readonly issueDe = (origine: DossierAnomalie, apres: DossierAnomalie) => IssueDeLAnomalie.depuis(origine, apres);
  protected readonly problemes = phrasesDuProbleme;
  protected readonly pointagesTardifs = pointagesTardifs;
  protected readonly peutDeplacer = peutDeplacer;
  protected readonly libelleActivite = libelleActivite;
  protected readonly intituleDeLActivite = intituleDeLActivite;
  protected readonly libelleDuGeste = libelleDuGeste;
  protected readonly labelForActivite = labelForActivite;
  protected readonly remplacementDe = remplacementDe;
  protected readonly detailDuPointage = detailDuPointage;
  protected readonly tempsActivite = tempsActivite;
  protected readonly detail = signal(false);
  protected readonly choixSelectionne = signal<string | undefined>(undefined);
  protected readonly propositionsFaites = signal(0);
  protected readonly types: readonly TypePointage[] = ['DEBUT', 'NON_CONFORMITE', 'FIN'];
  protected readonly intentions: readonly IntentionPointage[] = ['OUVERTURE', 'TRANSITION', 'FIN'];
  protected readonly adresse = computed(() => adresseDossier(this.chemin().get('suivi'), this.parametres().get('pointage')));
  protected readonly retour = computed(() => ({
    nature: this.parametres().get('nature'),
    operateur: this.parametres().get('operateur'),
    element: this.parametres().get('element'),
    page: this.parametres().get('page'),
  }));
  protected readonly lecture = resource({ params: () => ({ adresse: this.adresse() }), loader: ({ params }) => this.read(params.adresse) });
  protected readonly referentiel = resource({
    params: () => (this.droits.canApply() ? true : undefined),
    loader: () => this.port.referentiel(),
  });
  protected readonly etatReferentiel = etatDeLecture(this.referentiel);
  private readonly referentielConnu = computed(() => (this.referentiel.hasValue() ? this.referentiel.value() : undefined));
  protected readonly referentielLu = computed(() => this.referentielConnu() ?? REFERENTIEL_VIDE);
  protected readonly resultatLecture = computed(() => (this.lecture.error() ? undefined : this.lecture.value()));
  protected readonly dossier = computed(() => {
    if (this.lecture.isLoading()) return undefined;
    const lecture = this.resultatLecture();
    return lecture?.kind === 'DOSSIER' ? lecture.dossier : undefined;
  });
  protected readonly selection = linkedSignal<DossierAnomalie | undefined, SelectionDuDossier | undefined>({
    source: this.dossier,
    computation: selectionInitiale,
  });
  protected readonly pointageSelectionne = computed(() => {
    const selection = this.selection();
    return selection?.kind === 'POINTAGE' ? this.dossier()?.journal.find(pointage => pointage.id.pointage === selection.id) : undefined;
  });
  protected readonly activiteSelectionnee = computed(() => {
    const selection = this.selection();
    return selection?.kind === 'ACTIVITE' ? this.dossier()?.activites.find(activite => activite.id.activite === selection.id) : undefined;
  });
  private readonly maintenant = signal(new Date().toISOString());
  protected readonly proposition = computed(() => this.preparation.resolution().saisie.proposition);
  protected readonly choixAffiche = computed(() => (this.proposition() === undefined ? undefined : this.choixSelectionne()));
  protected readonly poignee = computed(() => poigneeDuDossier(this.dossier(), this.proposition(), this.maintenant(), this.occupe()));
  protected readonly placement = computed(() => placementDuDossier(this.dossier(), this.proposition(), this.maintenant(), this.occupe()));
  protected readonly apercu = computed(() => this.preparation.resolution().apercu);
  protected readonly occupe = computed(() =>
    ['PREVISUALISATION', 'CONFIRMATION', 'ISSUE_INCONNUE'].includes(this.preparation.operation().kind),
  );

  protected libelleChoix(choix: ChoixGuide): string {
    return choix.code === undefined ? choix.libelle : this.libelles.choix[choix.code].libelle;
  }

  protected explicationChoix(choix: ChoixGuide): string {
    return choix.code === undefined ? choix.explication : this.libelles.choix[choix.code].explication;
  }

  protected libelleContinuation(ligne: LigneConflit): string {
    return (
      ligne.explication
      || `${ligne.designation} · ${operateurPresente(ligne.operateur)} · ${this.instantLongDay.transform(ligne.date, this.now)} · ${ligne.nombrePointages} pointages`
    );
  }

  protected libelleDuPointage(journal: readonly PointageAnomalie[], identifiant: string): string {
    return referencePointage(journal, identifiant, this.now).libelle;
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

  protected cadreDe(dossier: DossierAnomalie): CadreDuFait {
    return CadreDuFait.depuis(dossier.activites, this.maintenant());
  }

  private lireLHorloge(): void {
    this.maintenant.set(new Date().toISOString());
  }

  protected choose(saisie: SaisieActe, choix?: string): void {
    this.lireLHorloge();
    this.preparation.choose(saisie);
    this.propositionsFaites.update(faites => faites + 1);
    this.detail.set(false);
    this.choixSelectionne.set(choix);
    this.focusHeading(this.propositionHeading);
  }

  protected chooseGuide(choix: ChoixGuide): void {
    this.choose(choix.saisie, choix.id);
    this.detail.set(choix.saisie.awaitsDating());
  }

  protected correct(pointage: PointageAnomalie): void {
    this.choose(SaisieActe.correct(pointage.id.pointage, pointage.fait));
    this.detail.set(true);
  }

  protected regularise(): void {
    this.choose(SaisieActe.regularise());
    this.detail.set(true);
  }

  protected cancel(pointage: PointageAnomalie): void {
    this.choose(SaisieActe.cancel(pointage.id.pointage));
  }

  protected change(changement: ChangementSaisie): void {
    this.lireLHorloge();
    this.preparation.change(changement);
    if (this.preparation.resolution().saisie.changesGuidedFact(changement)) this.choixSelectionne.set(undefined);
  }

  protected deplacer({ demande, poignee }: DeplacementDemande): void {
    this.lireLHorloge();
    this.change({ fait: { instant: instantDeplace(demande, poignee.instant, { min: poignee.bornes.min, max: this.maintenant() }) } });
  }

  protected placer({ instant, placement }: PlacementDemande): void {
    this.lireLHorloge();
    this.change({
      fait: {
        instant: instantDeplace({ kind: 'VERS', instant }, this.maintenant(), { min: placement.bornes.min, max: this.maintenant() }),
      },
    });
  }

  protected targetIsAbsent(dossier: DossierAnomalie, reference: string): boolean {
    return reference !== '' && !dossier.activites.some(activite => activite.id.activite === reference);
  }

  protected choisirOperateur(operateur: OperateurAnomalieId): void {
    this.change({ fait: { operateur: operateur.operateur } });
  }

  protected postesHabilites(operateur: string) {
    return this.referentielLu().postesHabilites(new OperateurAnomalieId(operateur));
  }

  protected autresPostes(operateur: string) {
    return this.referentielLu().autresPostes(new OperateurAnomalieId(operateur));
  }

  protected posteEstAbsent(poste: string): boolean {
    return poste !== '' && this.referentielLu().poste(new PosteAnomalieId(poste)) === undefined;
  }

  protected operateurDeLActe(operateur: string, journal: readonly PointageAnomalie[]): string {
    return operateurDeLActe(operateur, this.referentielConnu(), journal);
  }

  protected posteDeLActe(poste: string, journal: readonly PointageAnomalie[]): string {
    return posteDeLActe(poste, this.referentielConnu(), journal);
  }

  protected async preview(dossier: DossierAnomalie): Promise<void> {
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
      this.origine.set(this.dossier());
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
