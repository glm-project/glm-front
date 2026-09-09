import { Entreprise } from '../journal-du-pupitre/Entreprise';
import {
  EvenementsDuJournal,
  GesteDAtelier,
  GesteDePresence,
  IdentiteDuGeste,
  JournalDuPupitre,
  OperateurDuPupitre,
  snapshotDuJournal,
  SuiviDuPupitre,
  TypeDePointage,
  TypeDePresence,
} from '../journal-du-pupitre/JournalDuPupitre';
import { projectReferentiel } from '../journal-du-pupitre/JournalDuPupitreProjection';
import { ContextesParGeste } from './ContextesParGeste';
import { IdentiteDeFenetre } from './IdentiteDeFenetre';
import { IntentionGlobaleInitiee } from './IntentionGlobaleInitiee';
import { Matricule } from './Matricule';
import { NumeroDElement } from './NumeroDElement';

export interface ActiviteDePointage {
  readonly categorie: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly dureeMs: number;
}

export class ElementDePointage {
  constructor(
    readonly id: string,
    readonly numero: NumeroDElement,
    private readonly activite: ActiviteDePointage | undefined,
  ) {}

  isActive(): boolean {
    return this.activite !== undefined;
  }

  isNonConforme(): boolean {
    return this.activite?.categorie === 'NON_CONFORMITE';
  }

  dureeMs(): number {
    return this.activite?.dureeMs ?? 0;
  }
}

export interface VueDePointage {
  readonly moules: readonly ElementDePointage[];
  readonly ordresDeFabrication: readonly ElementDePointage[];
  readonly glmActif: boolean;
}

export type CibleDePointage = 'PRINCIPALE' | 'SECONDAIRE';
export type IntentionGlobaleDAtelier = 'PAUSE' | 'REPRENDRE' | 'TOUT_ARRETER';

export type ContexteDeGesteDAtelier =
  | { readonly kind: 'ELEMENT'; readonly numero: NumeroDElement }
  | { readonly kind: 'COMMANDE_GLOBALE'; readonly intention: IntentionGlobaleDAtelier };

export interface LotDeGestesDAtelier {
  readonly kind: 'GESTES';
  readonly capture: (arriveeAssuree?: boolean) => readonly GesteDAtelier[];
  readonly contextesParGeste: ContextesParGeste;
  readonly intention: number;
}

export interface AcceptationDeGestes {
  readonly gestes: readonly GesteDAtelier[];
  readonly applyTo: (fenetre: FenetreOperateur) => FenetreOperateur;
}

export interface DecisionResult {
  readonly fenetre: FenetreOperateur;
  readonly decision: DecisionDePointage;
}

export interface GestesDecisionResult {
  readonly fenetre: FenetreOperateur;
  readonly decision: LotDeGestesDAtelier;
}

export interface PosteAChoisir {
  readonly id: string;
  readonly libelle: string;
}

export interface ChoixDePosteRequis {
  readonly kind: 'CHOIX_POSTE_REQUIS';
  readonly numero: NumeroDElement;
  readonly postes: readonly PosteAChoisir[];
}

export type DecisionDePointage = LotDeGestesDAtelier | ChoixDePosteRequis;

export interface MessageDAtelier {
  readonly contexte?: ContexteDeGesteDAtelier;
  readonly message: string;
}

export interface RefusDAtelier extends MessageDAtelier {
  readonly contexte: ContexteDeGesteDAtelier;
}

export interface IdentiteOperateurDesigne {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly matricule: string;
}

interface EtatDeFenetreOperateur {
  readonly entreprise: Entreprise;
  readonly vue: JournalDuPupitre;
  readonly instantDOuverture: number;
  readonly identity: IdentiteDeFenetre;
  readonly globale: IntentionGlobaleInitiee | undefined;
  readonly arriveeAssuree: boolean;
  readonly contextesParGeste: ContextesParGeste;
  readonly intention: number;
  readonly refusVisible: RefusDAtelier | undefined;
  readonly operateurDesigne: OperateurDesigne;
}

interface TransitionDePointage {
  readonly type: TypeDePointage;
  readonly posteId?: string;
}

interface LotDeTransitions {
  readonly premiere: TransitionDePointage;
  readonly suivantes: readonly TransitionDePointage[];
}

type DecisionDOuverture =
  | { readonly kind: 'CHOIX_POSTE_REQUIS'; readonly postes: readonly PosteAChoisir[] }
  | { readonly kind: 'TRANSITION'; readonly transition: TransitionDePointage };

class HabilitationsDePoste {
  private constructor(private readonly postes: readonly PosteAChoisir[]) {}

  static from(source: readonly { readonly id: string; readonly libelle: string }[]): HabilitationsDePoste {
    return new HabilitationsDePoste(source.map(({ id, libelle }) => ({ id, libelle })));
  }

  decideOuverture(type: TypeDePointage): DecisionDOuverture {
    if (this.postes.length > 1) return { kind: 'CHOIX_POSTE_REQUIS', postes: this.postes };
    const posteId = this.postes[0]?.id;
    return { kind: 'TRANSITION', transition: posteId === undefined ? { type } : { type, posteId } };
  }

  require(posteId: string): void {
    if (this.postes.every(poste => poste.id !== posteId)) throw new Error('Poste absent des habilitations locales.');
  }
}

class OperateurDesigne {
  private readonly identite: IdentiteOperateurDesigne;
  private readonly habilitations: HabilitationsDePoste;

  constructor(source: OperateurDuPupitre, code: Matricule) {
    this.identite = { id: source.id, nom: source.nom, prenom: source.prenom, matricule: code.toString() };
    this.habilitations = HabilitationsDePoste.from(source.postes);
  }

  identity(): IdentiteOperateurDesigne {
    return this.identite;
  }

  decideOuverture(type: TypeDePointage): DecisionDOuverture {
    return this.habilitations.decideOuverture(type);
  }

  owns(operateurId: string): boolean {
    return this.identite.id === operateurId;
  }

  id(): string {
    return this.identite.id;
  }

  assertPoste(posteId: string): void {
    this.habilitations.require(posteId);
  }
}

type EtatDesActivites =
  | { readonly kind: 'INACTIF' }
  | {
      readonly kind: 'ACTIF';
      readonly premiere: SuiviDuPupitre['activites'][number];
      readonly suivantes: readonly SuiviDuPupitre['activites'][number][];
    };

type DecisionDesActivites = { readonly kind: 'INACTIF' } | { readonly kind: 'ACTIF'; readonly transitions: LotDeTransitions };

class ActivitesPersonnelles {
  private readonly etat: EtatDesActivites;

  constructor(
    suivi: SuiviDuPupitre,
    operateur: OperateurDesigne,
    private readonly instantDOuverture: number,
  ) {
    const [premiere, ...suivantes] = suivi.activites.filter(activite => operateur.owns(activite.operateurId));
    this.etat = premiere === undefined ? { kind: 'INACTIF' } : { kind: 'ACTIF', premiere, suivantes };
  }

  snapshot(): ActiviteDePointage | undefined {
    if (this.etat.kind === 'INACTIF') return undefined;
    const activites = [this.etat.premiere, ...this.etat.suivantes];
    const since = Math.min(...activites.map(activite => Date.parse(activite.depuis)));
    return {
      categorie: this.hasNonConformity(activites) ? 'NON_CONFORMITE' : 'TRAVAIL',
      dureeMs: Math.max(0, this.instantDOuverture - since),
    };
  }

  decide(cible: CibleDePointage): DecisionDesActivites {
    if (this.etat.kind === 'INACTIF') return this.etat;
    const activites = [this.etat.premiere, ...this.etat.suivantes];
    if (cible === 'PRINCIPALE') return { kind: 'ACTIF', transitions: this.transitionAll('FIN', this.etat) };
    const premiereNonConforme = activites.find(activite => activite.categorie === 'NON_CONFORMITE');
    if (premiereNonConforme !== undefined) {
      return {
        kind: 'ACTIF',
        transitions: {
          premiere: this.transition('DEBUT', premiereNonConforme.posteId),
          suivantes: activites
            .filter(activite => activite !== premiereNonConforme && activite.categorie === 'NON_CONFORMITE')
            .map(activite => this.transition('DEBUT', activite.posteId)),
        },
      };
    }
    return { kind: 'ACTIF', transitions: this.transitionAll('NON_CONFORMITE', this.etat) };
  }

  private transitionAll(type: TypeDePointage, etat: Extract<EtatDesActivites, { readonly kind: 'ACTIF' }>): LotDeTransitions {
    return {
      premiere: this.transition(type, etat.premiere.posteId),
      suivantes: etat.suivantes.map(activite => this.transition(type, activite.posteId)),
    };
  }

  private hasNonConformity(activites: readonly SuiviDuPupitre['activites'][number][]): boolean {
    return activites.some(activite => activite.categorie === 'NON_CONFORMITE');
  }

  private transition(type: TypeDePointage, posteId: string | undefined): TransitionDePointage {
    if (posteId === undefined) return { type };
    return { type, posteId };
  }
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
    if (operateur === undefined) throw new Error('Matricule absent du referentiel local.');
    return new FenetreOperateur({
      entreprise,
      vue,
      instantDOuverture,
      identity,
      globale: undefined,
      arriveeAssuree: false,
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
      arriveeAssuree: this.etat.arriveeAssuree || gestes.some(geste => geste.nature === 'ARRIVEE'),
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
    return decision.capture(this.etat.arriveeAssuree);
  }
  preparePresence(type: TypeDePresence, identify: () => IdentiteDuGeste): LotDeGestesDAtelier {
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

  private contexteFor(type: TypeDePresence): ContexteDeGesteDAtelier | undefined {
    if (type === 'PAUSE') return { kind: 'COMMANDE_GLOBALE', intention: 'PAUSE' };
    if (type === 'REPRISE') return { kind: 'COMMANDE_GLOBALE', intention: 'REPRENDRE' };
    return undefined;
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
      Pick<EtatDeFenetreOperateur, 'vue' | 'arriveeAssuree' | 'contextesParGeste' | 'intention' | 'refusVisible' | 'globale'>
    >,
  ): FenetreOperateur {
    return new FenetreOperateur({ ...this.etat, ...change });
  }
}
