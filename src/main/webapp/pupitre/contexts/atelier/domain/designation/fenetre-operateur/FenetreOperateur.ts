import { Entreprise } from '../../journal-du-pupitre/Entreprise';
import {
  ActiviteDuPupitre,
  afterLocalCapture,
  EvenementsDuJournal,
  GesteDePointage,
  IdentiteDuGeste,
  JournalDuPupitre,
  snapshotDuJournal,
  SuiviDuPupitre,
  toReouverture,
  TypeDOuverture,
} from '../../journal-du-pupitre/JournalDuPupitre';
import { projectReferentiel } from '../../journal-du-pupitre/JournalDuPupitreProjection';
import { ContextesParGeste } from '../ContextesParGeste';
import { Identifiant } from '../Identifiant';
import { IdentifiantInconnu } from '../IdentifiantInconnu';
import { IdentiteDeFenetre } from '../IdentiteDeFenetre';
import { IntentionGlobaleInitiee } from '../IntentionGlobaleInitiee';
import { NumeroDElement } from '../NumeroDElement';
import { ActivitesPersonnelles } from './ActivitesPersonnelles';
import { CommandesGlobales } from './CommandesGlobales';
import { RefusDAtelier } from './ContexteDeGesteDAtelier';
import {
  AcceptationDeGestes,
  CibleDePointage,
  DecisionDePointage,
  DecisionResult,
  GestesDecisionResult,
  LotDeGestesDAtelier,
} from './DecisionDePointage';
import { IdentiteOperateurDesigne, OperateurDesigne } from './OperateurDesigne';
import { ActiviteSuspendue, PauseEnCours } from './PauseEnCours';
import { LotDePointagesDemandes, PointageDemande } from './PointageDemande';
import { ElementDePointage, VueDePointage, zonesDePointage } from './VueDePointage';

const toPointageDemande = ({ reouverture, posteId }: ActiviteSuspendue): PointageDemande =>
  posteId === undefined ? { type: reouverture } : { type: reouverture, posteId };

interface ActivitePersonnelleConnue {
  readonly suiviId: string;
  readonly activite: ActiviteDuPupitre;
}

interface EtatDeFenetreOperateur {
  readonly entreprise: Entreprise;
  readonly vue: JournalDuPupitre;
  readonly instantDOuverture: number;
  readonly instantDEvaluation: number;
  readonly identity: IdentiteDeFenetre;
  readonly globale: IntentionGlobaleInitiee | undefined;
  readonly contextesParGeste: ContextesParGeste;
  readonly intention: number;
  readonly refusVisible: RefusDAtelier | undefined;
  readonly operateurDesigne: OperateurDesigne;
}

export class FenetreOperateur {
  readonly operateur: IdentiteOperateurDesigne;
  private constructor(private readonly etat: EtatDeFenetreOperateur) {
    this.operateur = etat.operateurDesigne.identity();
  }

  static open(
    entreprise: Entreprise,
    vue: JournalDuPupitre,
    code: Identifiant,
    instantDOuverture: number,
    identity: IdentiteDeFenetre,
  ): FenetreOperateur {
    const operateur = vue.referentiel?.operateurs.find(candidat => code.identifies(candidat.identifiant));
    if (operateur === undefined) throw new IdentifiantInconnu();
    return new FenetreOperateur({
      entreprise,
      vue,
      instantDOuverture,
      instantDEvaluation: instantDOuverture,
      identity,
      globale: undefined,
      contextesParGeste: ContextesParGeste.empty(),
      intention: 0,
      refusVisible: undefined,
      operateurDesigne: new OperateurDesigne(operateur, code),
    });
  }

  afterEvaluatingActivities(instant: number): FenetreOperateur {
    return this.with({ instantDEvaluation: instant });
  }

  prochaineEcheance(): number | undefined {
    const echeances = this.activitesPersonnellesConnues().map(({ activite }) => Date.parse(activite.echeance));
    return echeances.length === 0 ? undefined : Math.min(...echeances);
  }

  hasIdentity(other: FenetreOperateur): boolean {
    return this.identity().equals(other.identity());
  }
  identity(): IdentiteDeFenetre {
    return this.etat.identity;
  }
  allowsGestures(): boolean {
    return this.etat.globale === undefined;
  }
  afterIntendingGlobal(intention: IntentionGlobaleInitiee): FenetreOperateur {
    return this.afterIntendingGesture().with({ globale: intention });
  }
  afterCompletingGlobal(): FenetreOperateur {
    return this.with({ globale: undefined });
  }
  snapshot(): JournalDuPupitre {
    return snapshotDuJournal(this.etat.vue);
  }
  commandesGlobales(): CommandesGlobales {
    return new CommandesGlobales({
      activiteEnCours: this.activitesPersonnellesConnues().length > 0,
      pauseEnCours: this.pauseEnCours() !== undefined,
    });
  }
  pointage(): VueDePointage {
    const referentiel = projectReferentiel(this.etat.vue);
    const elements = (referentiel?.suivis ?? []).map(suivi => ({
      element: new ElementDePointage(suivi.id, NumeroDElement.from(suivi), this.activitesFor(suivi).snapshot()),
      categorie: suivi.categorie,
    }));
    const sorted = [...elements].sort((left, right) => left.element.numero.compare(right.element.numero));
    return { zones: zonesDePointage(sorted, referentiel?.categories ?? []) };
  }

  afterDeciding(suiviId: string, cible: CibleDePointage, identify: () => IdentiteDuGeste, instant: number): DecisionResult {
    const fenetre = this.afterEvaluatingActivities(instant).afterIntendingGesture();
    const suivi = fenetre.requireSuivi(suiviId);
    const activities = fenetre.activitesFor(suivi).decide();
    const numero = NumeroDElement.from(suivi);
    const decision =
      activities.kind === 'ACTIF'
        ? fenetre.gestes(suiviId, numero, activities.pointages, identify)
        : fenetre.ouverture(suiviId, numero, cible, identify);
    return { fenetre: fenetre.with({ contextesParGeste: fenetre.contextesOf(decision) }), decision };
  }
  afterChoosingPoste(
    suiviId: string,
    cible: CibleDePointage,
    posteId: string,
    identify: () => IdentiteDuGeste,
    instant: number,
  ): GestesDecisionResult {
    const fenetre = this.afterEvaluatingActivities(instant);
    fenetre.requireAvailableGestures();
    const suivi = fenetre.requireSuivi(suiviId);
    if (fenetre.activitesFor(suivi).decide().kind === 'ACTIF') throw new Error("L'élément est déjà actif pour cet opérateur.");
    fenetre.etat.operateurDesigne.assertPoste(posteId);
    const decision = fenetre.gestes(
      suiviId,
      NumeroDElement.from(suivi),
      { premiere: { type: fenetre.openingTypeFor(cible), posteId }, suivantes: [] },
      identify,
    );
    return {
      fenetre: fenetre.with({ refusVisible: undefined, contextesParGeste: decision.contextesParGeste }),
      decision,
    };
  }
  afterIntendingGesture(): FenetreOperateur {
    this.requireAvailableGestures();
    return this.with({ refusVisible: undefined, contextesParGeste: ContextesParGeste.empty(), intention: this.etat.intention + 1 });
  }

  private requireAvailableGestures(): void {
    if (!this.allowsGestures()) throw new Error('Une commande globale est en cours.');
  }
  afterReconciling(entreprise: Entreprise, vue: JournalDuPupitre): FenetreOperateur {
    if (!this.belongsTo(entreprise)) return this;
    const refus = new EvenementsDuJournal(vue.evenements).latestRefusalAmong(this.etat.contextesParGeste.gesteIds());
    const contexte = refus === undefined ? undefined : this.etat.contextesParGeste.contexteOf(refus.geste.id);
    return this.with({
      vue,
      refusVisible: refus !== undefined && contexte !== undefined ? { contexte, message: refus.refus.message } : undefined,
    });
  }
  prepareAcceptance(decision: LotDeGestesDAtelier): AcceptationDeGestes {
    const gestes = this.capture(decision);
    return {
      gestes,
      ...(decision.repriseAEffacer === undefined ? {} : { repriseAEffacer: decision.repriseAEffacer }),
      applyTo: fenetre => fenetre.afterLocalAcceptance(gestes, decision),
    };
  }
  afterAccept(gestes: readonly GesteDePointage[], repriseAEffacer?: string): FenetreOperateur {
    const journal = new EvenementsDuJournal(this.etat.vue.evenements);
    return this.with({
      contextesParGeste: this.etat.contextesParGeste,
      vue: afterLocalCapture(
        this.etat.vue,
        gestes.filter(geste => !journal.records(geste.id)),
        repriseAEffacer,
      ),
    });
  }
  refusal(): RefusDAtelier | undefined {
    return this.etat.refusVisible;
  }
  belongsTo(entreprise: Entreprise | undefined): boolean {
    return Entreprise.same(entreprise, this.etat.entreprise);
  }
  assertEntreprise(entreprise: Entreprise | undefined): void {
    if (!this.belongsTo(entreprise)) throw new Error('La fenetre operateur a change.');
  }
  journalScope(): Entreprise {
    return this.etat.entreprise;
  }
  capture(decision: LotDeGestesDAtelier): readonly GesteDePointage[] {
    return decision.capture();
  }
  preparePause(identify: () => IdentiteDuGeste, pause: string): LotDeGestesDAtelier {
    const fins = this.activitesPersonnellesConnues().map(({ suiviId, activite }) => ({
      ...this.finDe(suiviId, activite, identify()),
      suspension: { pause, reouverture: toReouverture(activite) },
    }));
    return {
      kind: 'GESTES',
      capture: () => fins,
      contextesParGeste: ContextesParGeste.forGestes(fins, { kind: 'COMMANDE_GLOBALE', intention: 'PAUSE' }),
      intention: this.etat.intention,
    };
  }
  prepareReprise(identify: () => IdentiteDuGeste): LotDeGestesDAtelier {
    const reouvertures = (this.pauseEnCours()?.activitesARouvrir() ?? []).map(activite =>
      this.toPointage(activite.suiviId, toPointageDemande(activite), identify()),
    );
    if (reouvertures.length === 0) return this.sansGeste();
    return {
      kind: 'GESTES',
      capture: () => reouvertures,
      contextesParGeste: ContextesParGeste.forGestes(reouvertures, { kind: 'COMMANDE_GLOBALE', intention: 'REPRENDRE' }),
      intention: this.etat.intention,
    };
  }
  prepareToutArreter(identify: () => IdentiteDuGeste): LotDeGestesDAtelier {
    const pointages = this.finsPersonnelles(identify);
    return {
      kind: 'GESTES',
      capture: () => pointages,
      contextesParGeste: ContextesParGeste.forGestes(pointages, { kind: 'COMMANDE_GLOBALE', intention: 'TOUT_ARRETER' }),
      repriseAEffacer: this.operateur.id,
      intention: this.etat.intention,
    };
  }

  private finsPersonnelles(identify: () => IdentiteDuGeste): readonly GesteDePointage[] {
    return this.activitesPersonnellesConnues().map(({ suiviId, activite }) => this.finDe(suiviId, activite, identify()));
  }

  private activitesPersonnellesConnues(): readonly ActivitePersonnelleConnue[] {
    return (projectReferentiel(this.etat.vue)?.suivis ?? []).flatMap(suivi =>
      this.activitesFor(suivi)
        .connues()
        .map(activite => ({ suiviId: suivi.id, activite })),
    );
  }

  private finDe(suiviId: string, activite: ActiviteDuPupitre, identite: IdentiteDuGeste): GesteDePointage {
    return this.toPointage(
      suiviId,
      activite.posteId === undefined ? { type: 'FIN' } : { type: 'FIN', posteId: activite.posteId },
      identite,
    );
  }

  private sansGeste(): LotDeGestesDAtelier {
    return { kind: 'GESTES', capture: () => [], contextesParGeste: ContextesParGeste.empty(), intention: this.etat.intention };
  }

  private pauseEnCours(): PauseEnCours | undefined {
    return PauseEnCours.of(this.etat.vue, this.etat.operateurDesigne.id(), this.etat.instantDEvaluation);
  }

  private afterLocalAcceptance(gestes: readonly GesteDePointage[], decision: LotDeGestesDAtelier): FenetreOperateur {
    const contextesParGeste = decision.intention === this.etat.intention ? decision.contextesParGeste : this.etat.contextesParGeste;
    return this.with({ contextesParGeste }).afterAccept(gestes, decision.repriseAEffacer);
  }

  private contextesOf(decision: DecisionDePointage): ContextesParGeste {
    return decision.kind === 'GESTES' ? decision.contextesParGeste : ContextesParGeste.empty();
  }

  private ouverture(suiviId: string, numero: NumeroDElement, cible: CibleDePointage, identify: () => IdentiteDuGeste): DecisionDePointage {
    const ouverture = this.etat.operateurDesigne.decideOuverture(this.openingTypeFor(cible));
    return ouverture.kind === 'CHOIX_POSTE_REQUIS'
      ? { kind: ouverture.kind, numero, postes: ouverture.postes }
      : this.gestes(suiviId, numero, { premiere: ouverture.pointage, suivantes: [] }, identify);
  }
  private gestes(
    suiviId: string,
    numero: NumeroDElement,
    demandes: LotDePointagesDemandes,
    identify: () => IdentiteDuGeste,
  ): LotDeGestesDAtelier {
    const first = this.toPointage(suiviId, demandes.premiere, identify());
    const pointages = [first, ...demandes.suivantes.map(demande => this.toPointage(suiviId, demande, identify()))];
    return {
      kind: 'GESTES',
      capture: () => pointages,
      contextesParGeste: ContextesParGeste.forGestes(pointages, { kind: 'ELEMENT', numero }),
      intention: this.etat.intention,
    };
  }
  private toPointage(suiviId: string, demande: PointageDemande, identite: IdentiteDuGeste): GesteDePointage {
    return { ...identite, ...demande, suiviId, operateurId: this.etat.operateurDesigne.id(), nature: 'POINTAGE' };
  }
  private requireSuivi(suiviId: string): SuiviDuPupitre {
    const suivi = projectReferentiel(this.etat.vue)?.suivis.find(candidate => candidate.id === suiviId);
    if (suivi === undefined) throw new Error('Élément absent du référentiel local.');
    return suivi;
  }
  private activitesFor(suivi: SuiviDuPupitre): ActivitesPersonnelles {
    return new ActivitesPersonnelles(suivi, this.etat.operateurDesigne, {
      ouverture: this.etat.instantDOuverture,
      evaluation: this.etat.instantDEvaluation,
    });
  }
  private openingTypeFor(cible: CibleDePointage): TypeDOuverture {
    return cible === 'PRINCIPALE' ? 'DEBUT' : 'NON_CONFORMITE';
  }
  private with(
    change: Partial<
      Pick<EtatDeFenetreOperateur, 'vue' | 'contextesParGeste' | 'intention' | 'refusVisible' | 'globale' | 'instantDEvaluation'>
    >,
  ): FenetreOperateur {
    return new FenetreOperateur({ ...this.etat, ...change });
  }
}
