import {
  InstantDatetimePipe,
  InstantLongDayPipe,
  InstantLongDayWithSecondsPipe,
  InstantTimeAndLongDayWithSecondsPipe,
} from '@/app/shared/date-format/infrastructure/primary/InstantPipes';
import { provideGestionDateAdapter } from '@/gestion/shared/design-system/infrastructure/primary/date-adapter/gestion-date.provider';
import { DateTimeField } from '@/gestion/shared/design-system/infrastructure/primary/date-time-field/DateTimeField';
import { NgComponentOutlet } from '@angular/common';
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
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PreparationActe } from '../../../application/PreparationActe';
import { CadreDuFait } from '../../../domain/acte/CadreDuFait';
import { ChangementSaisie, SaisieActe } from '../../../domain/acte/SaisieActe';
import { ActionDirecte, ActionsDirectes } from '../../../domain/dossier/ActionsDirectes';
import { adresseDossier } from '../../../domain/dossier/AdresseDossier';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import { AdresseDossier, ChoixGuide, DossierAnomalie, PointageAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { identifiantsDesPointagesTardifs } from '../../../domain/dossier/PointagesTardifs';
import { PosteAnomalieId } from '../../../domain/dossier/PosteAnomalieId';
import { ReferentielAnomalies } from '../../../domain/dossier/ReferentielAnomalies';
import { etatDeLecture } from '../EtatDeLecture';
import { LIBELLES_ANOMALIES } from '../LibellesAnomalies';
import {
  detailDuPointage,
  erreursALire,
  faitDuGeste,
  gesteDuFait,
  GESTES_PROPOSES,
  intituleDeLActivite,
  labelForActivite,
  libelleActivite,
  libelleDeLAction,
  libelleDuGeste,
  remplacementDe,
  selectionInitiale,
  tempsActivite,
} from '../PresentationDossier';
import { operateurDeLActe, operateurDuDossier, operateurPresente, posteDeLActe, postePresente } from '../PresentationIdentites';
import { SelectionDuDossier } from '../SelectionDuDossier';
import { ApercuDeLActe } from '../apercu-de-l-acte/ApercuDeLActe';
import { ChronologiePointagesPipe } from '../chronologie-pointages/ChronologiePointagesPipe';
import { ContinuationsDuDossier } from '../continuations-du-dossier/ContinuationsDuDossier';
import { DetailDuPointage } from '../detail-du-pointage/DetailDuPointage';
import { EnTeteDuDossier } from '../en-tete-du-dossier/EnTeteDuDossier';
import { instantDeplace, peutDeplacer } from '../frise-dossier/DeplacementDeLaPoignee';
import {
  bornesDuDeplacement,
  DeplacementDemande,
  PlacementDeLInstant,
  PlacementDemande,
  placementDuDossier,
  PoigneeDeFrise,
  poigneeDuDossier,
} from '../frise-dossier/PoigneeDeFrise';
import { SectionDeFrise } from '../section-de-frise/SectionDeFrise';
import { SelecteurOperateurAnomalie } from '../selecteur-operateur/SelecteurOperateurAnomalie';
import { StatutDeLOperation } from '../statut-de-l-operation/StatutDeLOperation';
import { LectureDuDossier } from './vues-de-resolution/LectureDuDossier';
import { Aiguillage, AiguillageSimple, aiguiller } from './vues-de-resolution/VuesDeResolution';

const REFERENTIEL_VIDE = new ReferentielAnomalies([], []);

const retourALaVueSimple = (aiguillage: Aiguillage | undefined, dossier: DossierAnomalie): AiguillageSimple | undefined => {
  const aQuitteUneVueSimple = aiguillage?.kind === 'COMPLETE' && aiguillage.vueSimple !== undefined;
  const aiguillageActuel = aiguiller(dossier);
  return aQuitteUneVueSimple && aiguillageActuel.kind === 'SIMPLE' ? aiguillageActuel : undefined;
};

@Component({
  selector: 'glm-dossier-anomalie',
  imports: [
    NgComponentOutlet,
    RouterLink,
    ChronologiePointagesPipe,
    InstantDatetimePipe,
    InstantLongDayPipe,
    InstantLongDayWithSecondsPipe,
    InstantTimeAndLongDayWithSecondsPipe,
    DateTimeField,
    SelecteurOperateurAnomalie,
    EnTeteDuDossier,
    SectionDeFrise,
    StatutDeLOperation,
    ContinuationsDuDossier,
    ApercuDeLActe,
    DetailDuPointage,
  ],
  templateUrl: './DossierAnomaliePage.html',
  styleUrls: ['../Boutons.css', './DossierAnomaliePage.css'],
  providers: [PreparationActe, ...provideGestionDateAdapter()],
})
export class DossierAnomaliePage {
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly apercuDeLActe = viewChild<ApercuDeLActe>('apercuDeLActe');
  private readonly propositionHeading = viewChild<ElementRef<HTMLHeadingElement>>('propositionHeading');
  private readonly port = inject(AnomaliesReadPort);
  private readonly chemin = toSignal(this.route.paramMap, { requireSync: true });
  private readonly parametres = toSignal(this.route.queryParamMap, { requireSync: true });
  private precedente: AdresseDossier | undefined;
  protected readonly now = new Date();
  protected readonly preparation = inject(PreparationActe);
  protected readonly libelles = LIBELLES_ANOMALIES;
  protected readonly libellesResolution = LIBELLES_ANOMALIES.resolution;
  protected readonly operateurDe = operateurPresente;
  protected readonly posteDe = postePresente;
  protected readonly actionsDirectes = (dossier: DossierAnomalie) => ActionsDirectes.depuis(dossier).actions;
  protected readonly identifiantsDesPointagesTardifs = identifiantsDesPointagesTardifs;
  protected readonly peutDeplacer = peutDeplacer;
  protected readonly libelleActivite = libelleActivite;
  protected readonly intituleDeLActivite = intituleDeLActivite;
  protected readonly libelleDuGeste = libelleDuGeste;
  protected readonly libelleDeLAction = libelleDeLAction;
  protected readonly labelForActivite = labelForActivite;
  protected readonly remplacementDe = remplacementDe;
  protected readonly detailDuPointage = detailDuPointage;
  protected readonly tempsActivite = tempsActivite;
  protected readonly detail = signal(false);
  protected readonly choixSelectionne = signal<string | undefined>(undefined);
  protected readonly propositionsFaites = signal(0);
  protected readonly identiteDeployee = linkedSignal({
    source: this.propositionsFaites,
    computation: () => untracked(() => this.saisie().operateurManque()),
  });
  protected readonly gestesProposes = GESTES_PROPOSES;
  protected readonly gesteDuFait = gesteDuFait;
  protected readonly erreursALire = erreursALire;
  protected readonly adresse = computed(() => adresseDossier(this.chemin().get('suivi'), this.parametres().get('pointage')));
  private readonly cleDeLAdresse = computed(() => {
    const adresse = this.adresse();
    return adresse === undefined ? '' : `${adresse.suivi.suivi}/${adresse.pointage.pointage}`;
  });
  protected readonly retour = computed(() => ({
    nature: this.parametres().get('nature'),
    operateur: this.parametres().get('operateur'),
    element: this.parametres().get('element'),
    page: this.parametres().get('page'),
  }));
  protected readonly lecture = resource({ params: () => ({ adresse: this.adresse() }), loader: ({ params }) => this.read(params.adresse) });
  protected readonly referentiel = resource({ loader: () => this.port.referentiel() });
  protected readonly etatReferentiel = etatDeLecture(this.referentiel);
  protected readonly identiteForcee = computed(() => this.etatReferentiel.premierChargement() || this.etatReferentiel.enPanne());
  protected readonly identiteDepliee = computed(() => this.identiteDeployee() || this.identiteForcee());
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
    const dossier = this.dossier();
    return selection?.kind === 'POINTAGE'
      ? dossier?.perimetre.pointagesDe(dossier).find(pointage => pointage.id.pointage === selection.id)
      : undefined;
  });
  protected readonly activiteSelectionnee = computed(() => {
    const selection = this.selection();
    return selection?.kind === 'ACTIVITE' ? this.dossier()?.activites.find(activite => activite.id.activite === selection.id) : undefined;
  });
  protected readonly aiguillage = linkedSignal<
    { readonly cle: string; readonly dossier: DossierAnomalie | undefined },
    Aiguillage | undefined
  >({
    source: () => ({ cle: this.cleDeLAdresse(), dossier: this.dossier() }),
    computation: ({ cle, dossier }, precedent) => {
      const fige = precedent?.source.cle === cle ? precedent.value : undefined;
      return fige ?? (dossier === undefined ? undefined : aiguiller(dossier));
    },
  });
  protected readonly vueSimple = computed(() => {
    const aiguillage = this.aiguillage();
    return aiguillage?.kind === 'SIMPLE' ? aiguillage : undefined;
  });
  protected readonly retourALaVueSimple = (dossier: DossierAnomalie) => retourALaVueSimple(this.aiguillage(), dossier);
  protected readonly sortieAConfirmer = signal(false);
  protected readonly lectureDuDossier: LectureDuDossier = {
    relire: adresse => this.relire(adresse),
    remplacerPar: dossier => {
      this.remplacerPar(dossier);
    },
  };
  private readonly maintenant = signal(new Date().toISOString());
  protected readonly saisie = computed(() => this.preparation.resolution().saisie);
  protected readonly proposition = computed(() => this.saisie().proposition);
  protected readonly choixAffiche = computed(() => (this.proposition() === undefined ? undefined : this.choixSelectionne()));
  protected readonly apercu = computed(() => this.preparation.resolution().apercu);
  protected readonly occupe = computed(() =>
    ['PREVISUALISATION', 'CONFIRMATION', 'ISSUE_INCONNUE'].includes(this.preparation.operation().kind),
  );

  protected nomDeLOperateur(dossier: DossierAnomalie): string | undefined {
    return operateurDuDossier(dossier, this.referentielConnu());
  }

  protected libelleChoix(choix: ChoixGuide): string {
    return choix.code === undefined ? choix.libelle : this.libelles.choix[choix.code].libelle;
  }

  protected explicationChoix(choix: ChoixGuide): string {
    return choix.code === undefined ? choix.explication : this.libelles.choix[choix.code].explication;
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
    this.sortieAConfirmer.set(false);
  }

  protected demanderUneAutreCorrection(vue: AiguillageSimple): void {
    if (this.saisie().heureDifferenteDe(vue.choix.saisie)) this.sortieAConfirmer.set(true);
    else this.passerALaVueComplete(vue);
  }

  protected passerALaVueComplete(vue: AiguillageSimple): void {
    this.contextChanged();
    this.aiguillage.set({ kind: 'COMPLETE', vueSimple: vue });
  }

  protected revenirALaVueSimple(vue: AiguillageSimple): void {
    this.contextChanged();
    this.aiguillage.set(vue);
  }

  private async relire(adresse: AdresseDossier): Promise<DossierAnomalie | undefined> {
    try {
      const lecture = await this.port.read(adresse);
      this.lecture.value.set(lecture);
      return lecture.kind === 'DOSSIER' ? lecture.dossier : undefined;
    } catch {
      this.lecture.reload();
      return undefined;
    }
  }

  private remplacerPar(dossier: DossierAnomalie): void {
    this.lecture.value.set({ kind: 'DOSSIER', dossier });
  }

  protected poigneeDe(dossier: DossierAnomalie): PoigneeDeFrise | undefined {
    return poigneeDuDossier(dossier, this.proposition(), this.maintenant(), this.occupe());
  }

  protected placementDe(dossier: DossierAnomalie): PlacementDeLInstant | undefined {
    return placementDuDossier(dossier, this.proposition(), this.maintenant(), this.occupe());
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
    this.focusAfterNextRender(() => this.propositionHeading()?.nativeElement.focus());
  }

  protected chooseGuide(choix: ChoixGuide): void {
    this.choose(choix.saisie, choix.id);
    this.detail.set(choix.saisie.awaitsDating());
  }

  protected identifiantDeLAction(action: ActionDirecte): string {
    return `${action.saisie.acte()}:${action.pointage.id.pointage}`;
  }

  protected chooseAction(action: ActionDirecte): void {
    this.choose(action.saisie, this.identifiantDeLAction(action));
    this.detail.set(action.saisie.acte() === 'CORRECTION');
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

  protected deplacer(dossier: DossierAnomalie, { demande, poignee }: DeplacementDemande): void {
    this.lireLHorloge();
    this.change({
      fait: { instant: instantDeplace(demande, poignee.instant, bornesDuDeplacement(this.cadreDe(dossier), dossier, poignee)) },
    });
  }

  protected placer(dossier: DossierAnomalie, { demande, placement }: PlacementDemande): void {
    this.lireLHorloge();
    this.change({
      fait: { instant: instantDeplace(demande, this.maintenant(), bornesDuDeplacement(this.cadreDe(dossier), dossier, placement)) },
    });
  }

  protected targetIsAbsent(dossier: DossierAnomalie, reference: string): boolean {
    return reference !== '' && !dossier.activites.some(activite => activite.id.activite === reference);
  }

  protected choisirLeGeste(valeur: string): void {
    this.change({ fait: faitDuGeste(valeur) });
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
    this.focusAfterNextRender(() => this.apercuDeLActe()?.focusTitre());
  }

  private focusAfterNextRender(focus: () => void): void {
    afterNextRender(focus, { injector: this.injector });
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
    if (resultat.kind === 'APPLIQUE') this.remplacerPar(resultat.dossier);
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
