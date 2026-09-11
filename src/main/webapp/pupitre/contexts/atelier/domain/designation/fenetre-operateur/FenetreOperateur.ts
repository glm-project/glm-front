import { Entreprise } from '../../journal-du-pupitre/Entreprise';
import {
  EvenementsDuJournal,
  GesteDAtelier,
  GesteDePresence,
  IdentiteDuGeste,
  JournalDuPupitre,
  snapshotDuJournal,
  SuiviDuPupitre,
  TypeDePointage,
} from '../../journal-du-pupitre/JournalDuPupitre';
import { projectReferentiel } from '../../journal-du-pupitre/JournalDuPupitreProjection';
import { ContextesParGeste } from '../ContextesParGeste';
import { IdentiteDeFenetre } from '../IdentiteDeFenetre';
import { IntentionGlobaleInitiee } from '../IntentionGlobaleInitiee';
import { Matricule } from '../Matricule';
import { MatriculeInconnu } from '../MatriculeInconnu';
import { NumeroDElement } from '../NumeroDElement';
import { ActivitesPersonnelles } from './ActivitesPersonnelles';
import { AssuranceDArrivee } from './AssuranceDArrivee';
import { ContexteDeGesteDAtelier, RefusDAtelier } from './ContexteDeGesteDAtelier';
import {
  AcceptationDeGestes,
  CibleDePointage,
  DecisionDePointage,
  DecisionResult,
  GestesDecisionResult,
  LotDeGestesDAtelier,
} from './DecisionDePointage';
import { IdentiteOperateurDesigne, OperateurDesigne } from './OperateurDesigne';
import { LotDeTransitions, TransitionDePointage } from './TransitionDePointage';
import { ElementDePointage, VueDePointage } from './VueDePointage';

interface EtatDeFenetreOperateur {
  readonly entreprise: Entreprise;
  readonly vue: JournalDuPupitre;
  readonly instantDOuverture: number;
  readonly identity: IdentiteDeFenetre;
  readonly globale: IntentionGlobaleInitiee | undefined;
  readonly assuranceArrivee: AssuranceDArrivee;
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
    code: Matricule,
    instantDOuverture: number,
    identity: IdentiteDeFenetre,
  ): FenetreOperateur {
    const operateur = vue.referentiel?.operateurs.find(candidat => code.identifies(candidat.matricule));
    if (operateur === undefined) throw new MatriculeInconnu();
    return new FenetreOperateur({
      entreprise,
      vue,
      instantDOuverture,
      identity,
      globale: undefined,
      assuranceArrivee: new AssuranceDArrivee(),
      contextesParGeste: ContextesParGeste.empty(),
      intention: 0,
      refusVisible: undefined,
      operateurDesigne: new OperateurDesigne(operateur, code),
    });
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
  pointage(): VueDePointage {
    const elements = (projectReferentiel(this.etat.vue)?.suivis ?? []).map(suivi => ({
      element: new ElementDePointage(suivi.id, NumeroDElement.from(suivi), this.activitesFor(suivi).snapshot()),
      type: suivi.type,
    }));
    const sorted = [...elements].sort((left, right) => left.element.numero.compare(right.element.numero));
    return {
      moules: sorted.filter(({ type }) => type === 'PRODUIT').map(({ element }) => element),
      ordresDeFabrication: sorted.filter(({ type }) => type === 'ORDRE_DE_FABRICATION').map(({ element }) => element),
      glmActif: elements.every(({ element }) => !element.isActive()),
    };
  }

  afterDeciding(suiviId: string, cible: CibleDePointage, identify: () => IdentiteDuGeste): DecisionResult {
    const fenetre = this.afterIntendingGesture();
    const suivi = fenetre.requireSuivi(suiviId);
    const activities = fenetre.activitesFor(suivi).decide(cible);
    const numero = NumeroDElement.from(suivi);
    const decision =
      activities.kind === 'ACTIF'
        ? fenetre.gestes(suiviId, numero, activities.transitions, identify, activities.transitions.premiere.type === 'DEBUT')
        : fenetre.ouverture(suiviId, numero, cible, identify);
    return { fenetre: fenetre.with({ contextesParGeste: fenetre.contextesOf(decision) }), decision };
  }
  afterChoosingPoste(suiviId: string, cible: CibleDePointage, posteId: string, identify: () => IdentiteDuGeste): GestesDecisionResult {
    this.requireAvailableGestures();
    const suivi = this.requireSuivi(suiviId);
    if (this.activitesFor(suivi).decide(cible).kind === 'ACTIF') throw new Error("L'élément est déjà actif pour cet opérateur.");
    this.etat.operateurDesigne.assertPoste(posteId);
    const decision = this.gestes(
      suiviId,
      NumeroDElement.from(suivi),
      { premiere: { type: this.openingTypeFor(cible), posteId }, suivantes: [] },
      identify,
      true,
    );
    return {
      fenetre: this.with({ refusVisible: undefined, contextesParGeste: decision.contextesParGeste }),
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
      applyTo: fenetre => fenetre.afterLocalAcceptance(gestes, decision),
    };
  }
  afterAccept(gestes: readonly GesteDAtelier[]): FenetreOperateur {
    const journal = new EvenementsDuJournal(this.etat.vue.evenements);
    return this.with({
      assuranceArrivee: this.etat.assuranceArrivee.afterAccept(gestes),
      contextesParGeste: this.etat.contextesParGeste,
      vue: {
        ...this.etat.vue,
        evenements: [
          ...this.etat.vue.evenements,
          ...gestes.filter(geste => !journal.records(geste.id)).map(geste => ({ geste, etat: 'EN_ATTENTE' as const })),
        ],
      },
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
  capture(decision: LotDeGestesDAtelier): readonly GesteDAtelier[] {
    return decision.capture(this.etat.assuranceArrivee.isAssuree());
  }
  preparePresence(type: 'PAUSE' | 'REPRISE', identify: () => IdentiteDuGeste): LotDeGestesDAtelier {
    const presence: GesteDePresence = {
      ...identify(),
      operateurId: this.etat.operateurDesigne.id(),
      nature: 'PRESENCE',
      type,
      implicite: false,
    };
    const arrivee: GesteDAtelier = {
      ...identify(),
      dateDeSurvenue: presence.dateDeSurvenue,
      operateurId: this.etat.operateurDesigne.id(),
      nature: 'ARRIVEE',
    };
    const presenceApresAssurance: GesteDePresence =
      type === 'REPRISE' ? { ...presence, type, implicite: false, assuranceArriveeId: arrivee.id } : presence;
    const contexte = this.contexteFor(type);
    return {
      kind: 'GESTES',
      capture: (assured = false) => (assured ? [presence] : [arrivee, presenceApresAssurance]),
      contextesParGeste: ContextesParGeste.forGestes([arrivee, presenceApresAssurance], contexte),
      intention: this.etat.intention,
    };
  }
  prepareToutArreter(identify: () => IdentiteDuGeste): LotDeGestesDAtelier {
    const depart: GesteDePresence = {
      ...identify(),
      operateurId: this.etat.operateurDesigne.id(),
      nature: 'PRESENCE' as const,
      type: 'DEPART' as const,
      implicite: false,
    };
    const pointages = (projectReferentiel(this.etat.vue)?.suivis ?? []).flatMap(suivi =>
      suivi.activites
        .filter(activite => this.etat.operateurDesigne.owns(activite.operateurId))
        .map(activite =>
          this.toPointage(suivi.id, activite.posteId === undefined ? { type: 'FIN' } : { type: 'FIN', posteId: activite.posteId }, {
            ...identify(),
            dateDeSurvenue: depart.dateDeSurvenue,
          }),
        ),
    );
    const arrivee: GesteDAtelier = {
      ...identify(),
      dateDeSurvenue: depart.dateDeSurvenue,
      operateurId: this.etat.operateurDesigne.id(),
      nature: 'ARRIVEE',
    };
    return {
      kind: 'GESTES',
      capture: (assured = false) => [...(assured ? [] : [arrivee]), ...pointages, depart],
      contextesParGeste: ContextesParGeste.forGestes([arrivee, ...pointages, depart], {
        kind: 'COMMANDE_GLOBALE',
        intention: 'TOUT_ARRETER',
      }),
      intention: this.etat.intention,
    };
  }

  private afterLocalAcceptance(gestes: readonly GesteDAtelier[], decision: LotDeGestesDAtelier): FenetreOperateur {
    const contextesParGeste = decision.intention === this.etat.intention ? decision.contextesParGeste : this.etat.contextesParGeste;
    return this.with({ contextesParGeste }).afterAccept(gestes);
  }

  private contextesOf(decision: DecisionDePointage): ContextesParGeste {
    return decision.kind === 'GESTES' ? decision.contextesParGeste : ContextesParGeste.empty();
  }

  private contexteFor(type: 'PAUSE' | 'REPRISE'): ContexteDeGesteDAtelier {
    if (type === 'PAUSE') return { kind: 'COMMANDE_GLOBALE', intention: 'PAUSE' };
    return { kind: 'COMMANDE_GLOBALE', intention: 'REPRENDRE' };
  }

  private ouverture(suiviId: string, numero: NumeroDElement, cible: CibleDePointage, identify: () => IdentiteDuGeste): DecisionDePointage {
    const ouverture = this.etat.operateurDesigne.decideOuverture(this.openingTypeFor(cible));
    return ouverture.kind === 'CHOIX_POSTE_REQUIS'
      ? { kind: ouverture.kind, numero, postes: ouverture.postes }
      : this.gestes(suiviId, numero, { premiere: ouverture.transition, suivantes: [] }, identify, true);
  }
  private gestes(
    suiviId: string,
    numero: NumeroDElement,
    transitions: LotDeTransitions,
    identify: () => IdentiteDuGeste,
    repriseImplicite: boolean,
  ): LotDeGestesDAtelier {
    const first = this.toPointage(suiviId, transitions.premiere, identify());
    const pointages = [first, ...transitions.suivantes.map(t => this.toPointage(suiviId, t, identify()))];
    const arrivee: GesteDAtelier = {
      ...identify(),
      dateDeSurvenue: first.dateDeSurvenue,
      operateurId: this.etat.operateurDesigne.id(),
      nature: 'ARRIVEE',
    };
    const reprise: GesteDePresence = {
      ...identify(),
      dateDeSurvenue: first.dateDeSurvenue,
      operateurId: this.etat.operateurDesigne.id(),
      nature: 'PRESENCE',
      type: 'REPRISE',
      implicite: true,
    };
    return {
      kind: 'GESTES',
      capture: (assured = false) => [...(assured ? [] : [arrivee]), ...(repriseImplicite ? [reprise] : []), ...pointages],
      contextesParGeste: ContextesParGeste.forGestes(pointages, { kind: 'ELEMENT', numero }),
      intention: this.etat.intention,
    };
  }
  private toPointage(suiviId: string, transition: TransitionDePointage, identite: IdentiteDuGeste): GesteDAtelier {
    return { ...identite, ...transition, suiviId, operateurId: this.etat.operateurDesigne.id(), nature: 'POINTAGE' };
  }
  private requireSuivi(suiviId: string): SuiviDuPupitre {
    const suivi = projectReferentiel(this.etat.vue)?.suivis.find(candidate => candidate.id === suiviId);
    if (suivi === undefined) throw new Error('Élément absent du référentiel local.');
    return suivi;
  }
  private activitesFor(suivi: SuiviDuPupitre): ActivitesPersonnelles {
    return new ActivitesPersonnelles(suivi, this.etat.operateurDesigne, this.etat.instantDOuverture);
  }
  private openingTypeFor(cible: CibleDePointage): TypeDePointage {
    return cible === 'PRINCIPALE' ? 'DEBUT' : 'NON_CONFORMITE';
  }
  private with(
    change: Partial<
      Pick<EtatDeFenetreOperateur, 'vue' | 'assuranceArrivee' | 'contextesParGeste' | 'intention' | 'refusVisible' | 'globale'>
    >,
  ): FenetreOperateur {
    return new FenetreOperateur({ ...this.etat, ...change });
  }
}
