import {
  GesteDAtelier,
  IdentiteDuGeste,
  JournalDuPupitre,
  OperateurDuPupitre,
  SuiviDuPupitre,
  TypeDePointage,
  TypeDePresence,
} from '../journal-du-pupitre/JournalDuPupitre';
import { projectReferentiel } from '../journal-du-pupitre/JournalDuPupitreProjection';

export interface ActiviteDePointage {
  readonly categorie: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly dureeMs: number;
}

export class ElementDePointage {
  constructor(
    readonly id: string,
    readonly numero: string,
    readonly repliSurNom: boolean,
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

export interface GestesDePointage {
  readonly kind: 'GESTES';
  readonly capture: () => GesteDAtelier[];
}

export interface PosteAChoisir {
  readonly id: string;
  readonly libelle: string;
}

export interface ChoixDePosteRequis {
  readonly kind: 'CHOIX_POSTE_REQUIS';
  readonly numero: string;
  readonly postes: readonly PosteAChoisir[];
}

export type DecisionDePointage = GestesDePointage | ChoixDePosteRequis;

export interface RefusDePointageVisible {
  readonly numero: string;
  readonly message: string;
}

export interface IdentiteOperateurDesigne {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly matricule: string;
}

interface TransitionDePointage {
  type: TypeDePointage;
  posteId?: string;
}

interface LotDeTransitions {
  readonly premiere: TransitionDePointage;
  readonly suivantes: readonly TransitionDePointage[];
}

type DecisionDOuverture =
  | { readonly kind: 'CHOIX_POSTE_REQUIS'; readonly postes: readonly PosteAChoisir[] }
  | { readonly kind: 'TRANSITION'; readonly transition: TransitionDePointage };

class OperateurDesigne {
  private readonly identite: IdentiteOperateurDesigne;
  private readonly postes: readonly PosteAChoisir[];

  constructor(source: OperateurDuPupitre, code: string) {
    this.identite = { id: source.id, nom: source.nom, prenom: source.prenom, matricule: code };
    this.postes = source.postes.map(({ id, libelle }) => ({ id, libelle }));
  }

  identity(): IdentiteOperateurDesigne {
    return this.identite;
  }

  decideOuverture(type: TypeDePointage): DecisionDOuverture {
    if (this.postes.length > 1) return { kind: 'CHOIX_POSTE_REQUIS', postes: this.postes };
    const posteId = this.postes[0]?.id;
    return { kind: 'TRANSITION', transition: posteId === undefined ? { type } : { type, posteId } };
  }

  owns(operateurId: string): boolean {
    return this.identite.id === operateurId;
  }

  id(): string {
    return this.identite.id;
  }

  assertPoste(posteId: string): void {
    if (this.postes.every(poste => poste.id !== posteId)) {
      throw new Error('Poste absent des habilitations locales.');
    }
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

  private transitionAll(type: TypeDePointage, etat: Extract<EtatDesActivites, { kind: 'ACTIF' }>): LotDeTransitions {
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
  private readonly operateurDesigne: OperateurDesigne;
  private arriveeAssuree = false;
  private readonly numerosParGeste = new Map<string, string>();
  private refusVisible: RefusDePointageVisible | undefined;

  constructor(
    private readonly entreprise: string,
    private vue: JournalDuPupitre,
    code: string,
    private readonly instantDOuverture: number,
  ) {
    const operateur = vue.referentiel?.operateurs.find(candidat => candidat.matricule === code);
    if (operateur === undefined) {
      throw new Error('Matricule absent du referentiel local.');
    }
    this.operateurDesigne = new OperateurDesigne(operateur, code);
    this.operateur = this.operateurDesigne.identity();
  }

  snapshot(): JournalDuPupitre {
    return this.vue;
  }

  pointage(): VueDePointage {
    const suivis = projectReferentiel(this.vue)?.suivis ?? [];
    const elements = suivis.map(suivi => {
      const activite = this.activitesFor(suivi).snapshot();
      const element = new ElementDePointage(suivi.id, suivi.reference ?? suivi.nom, suivi.reference === undefined, activite);
      return { element, type: suivi.type };
    });
    const sorted = [...elements].sort((left, right) =>
      left.element.numero.localeCompare(right.element.numero, 'fr', { numeric: true, sensitivity: 'base' }),
    );
    return {
      moules: sorted.filter(({ type }) => type === 'PRODUIT').map(({ element }) => element),
      ordresDeFabrication: sorted.filter(({ type }) => type === 'ORDRE_DE_FABRICATION').map(({ element }) => element),
      glmActif: elements.every(({ element }) => !element.isActive()),
    };
  }

  decide(suiviId: string, cible: CibleDePointage, identify: () => IdentiteDuGeste): DecisionDePointage {
    this.refusVisible = undefined;
    const suivi = this.requireSuivi(suiviId);
    const activites = this.activitesFor(suivi);
    const decisionDesActivites = activites.decide(cible);
    const numero = this.numeroDuSuivi(suivi);
    if (decisionDesActivites.kind === 'ACTIF') {
      return {
        kind: 'GESTES',
        capture: this.prepareTransitions(suiviId, numero, decisionDesActivites.transitions, identify),
      };
    }
    const ouverture = this.operateurDesigne.decideOuverture(this.openingTypeFor(cible));
    if (ouverture.kind === 'CHOIX_POSTE_REQUIS') {
      return { kind: ouverture.kind, numero, postes: ouverture.postes };
    }
    return {
      kind: 'GESTES',
      capture: this.prepareTransitions(suiviId, numero, { premiere: ouverture.transition, suivantes: [] }, identify),
    };
  }

  choosePoste(suiviId: string, cible: CibleDePointage, posteId: string, identify: () => IdentiteDuGeste): GestesDePointage {
    this.refusVisible = undefined;
    const suivi = this.requireSuivi(suiviId);
    if (this.activitesFor(suivi).decide(cible).kind === 'ACTIF') throw new Error("L'élément est déjà actif pour cet opérateur.");
    this.operateurDesigne.assertPoste(posteId);
    return {
      kind: 'GESTES',
      capture: this.prepareTransitions(
        suiviId,
        this.numeroDuSuivi(suivi),
        { premiere: { type: this.openingTypeFor(cible), posteId }, suivantes: [] },
        identify,
      ),
    };
  }

  reconcile(entreprise: string, vue: JournalDuPupitre): void {
    if (!this.belongsTo(entreprise)) return;
    this.vue = vue;
    const refus = [...vue.evenements]
      .reverse()
      .find(evenement => evenement.etat === 'REFUSE' && this.numerosParGeste.has(evenement.geste.id));
    const numero = refus === undefined ? undefined : this.numerosParGeste.get(refus.geste.id);
    if (refus?.geste.nature !== 'POINTAGE' || refus.refus === undefined || numero === undefined) {
      this.refusVisible = undefined;
      return;
    }
    this.refusVisible = { numero, message: refus.refus.message };
  }

  refus(): RefusDePointageVisible | undefined {
    return this.refusVisible;
  }

  belongsTo(entreprise: string | undefined): boolean {
    return entreprise === this.entreprise;
  }

  assertEntreprise(entreprise: string | undefined): void {
    if (!this.belongsTo(entreprise)) throw new Error('La fenetre operateur a change.');
  }

  journalScope(): string {
    return this.entreprise;
  }

  private requireSuivi(suiviId: string): SuiviDuPupitre {
    const suivi = projectReferentiel(this.vue)?.suivis.find(candidate => candidate.id === suiviId);
    if (suivi === undefined) throw new Error('Élément absent du référentiel local.');
    return suivi;
  }

  private activitesFor(suivi: SuiviDuPupitre): ActivitesPersonnelles {
    return new ActivitesPersonnelles(suivi, this.operateurDesigne, this.instantDOuverture);
  }

  private openingTypeFor(cible: CibleDePointage): TypeDePointage {
    return cible === 'PRINCIPALE' ? 'DEBUT' : 'NON_CONFORMITE';
  }

  private prepareTransitions(
    suiviId: string,
    numero: string,
    transitions: LotDeTransitions,
    identify: () => IdentiteDuGeste,
  ): () => GesteDAtelier[] {
    const first = this.toPointage(suiviId, numero, transitions.premiere, identify());
    const pointages = [first, ...transitions.suivantes.map(transition => this.toPointage(suiviId, numero, transition, identify()))];
    const arrivee: GesteDAtelier = {
      ...identify(),
      dateDeSurvenue: first.dateDeSurvenue,
      operateurId: this.operateurDesigne.id(),
      nature: 'ARRIVEE',
    };
    const reprise: GesteDAtelier = {
      ...identify(),
      dateDeSurvenue: first.dateDeSurvenue,
      operateurId: this.operateurDesigne.id(),
      nature: 'PRESENCE',
      type: 'REPRISE',
      implicite: true,
    };
    return () => (this.arriveeAssuree ? pointages : [arrivee, reprise, ...pointages]);
  }

  private toPointage(suiviId: string, numero: string, transition: TransitionDePointage, identite: IdentiteDuGeste): GesteDAtelier {
    const geste: GesteDAtelier = { ...identite, ...transition, suiviId, operateurId: this.operateurDesigne.id(), nature: 'POINTAGE' };
    this.numerosParGeste.set(geste.id, numero);
    return geste;
  }

  private numeroDuSuivi(suivi: SuiviDuPupitre): string {
    return suivi.reference ?? suivi.nom;
  }

  preparePresence(type: TypeDePresence, identite: IdentiteDuGeste): GesteDAtelier[] {
    return [{ ...identite, operateurId: this.operateurDesigne.id(), nature: 'PRESENCE', type, implicite: false }];
  }

  accept(gestes: GesteDAtelier[]): void {
    this.arriveeAssuree ||= gestes.some(geste => geste.nature === 'POINTAGE');
    this.vue = { ...this.vue, evenements: [...this.vue.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))] };
  }
}
