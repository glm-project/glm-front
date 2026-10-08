import { ActiviteDuPupitre, SuiviDuPupitre, TypeDePointage } from '../../journal-du-pupitre/JournalDuPupitre';
import { CibleDePointage } from './DecisionDePointage';
import { OperateurDesigne } from './OperateurDesigne';
import { LotDeTransitions, TransitionDePointage } from './TransitionDePointage';
import { ActiviteDePointage } from './VueDePointage';

type EtatDesActivites =
  | { readonly kind: 'INACTIF' }
  | {
      readonly kind: 'ACTIF';
      readonly premiere: SuiviDuPupitre['activites'][number];
      readonly suivantes: readonly SuiviDuPupitre['activites'][number][];
    };

type DecisionDesActivites = { readonly kind: 'INACTIF' } | { readonly kind: 'ACTIF'; readonly transitions: LotDeTransitions };

export class ActivitesPersonnelles {
  private readonly etat: EtatDesActivites;
  private readonly activites: readonly ActiviteDuPupitre[];

  constructor(
    suivi: SuiviDuPupitre,
    operateur: OperateurDesigne,
    private readonly instants: { readonly ouverture: number; readonly evaluation: number },
  ) {
    this.activites = suivi.activites.filter(activite => this.isActionnable(activite, operateur));
    const [premiere, ...suivantes] = this.activites;
    this.etat = premiere === undefined ? { kind: 'INACTIF' } : { kind: 'ACTIF', premiere, suivantes };
  }

  connues(): readonly ActiviteDuPupitre[] {
    return this.activites;
  }

  private isActionnable(activite: ActiviteDuPupitre, operateur: OperateurDesigne): boolean {
    return operateur.owns(activite.operateurId) && this.instants.evaluation < Date.parse(activite.echeance);
  }

  snapshot(): ActiviteDePointage | undefined {
    if (this.etat.kind === 'INACTIF') return undefined;
    const activites = [this.etat.premiere, ...this.etat.suivantes];
    const since = Math.min(...activites.map(activite => Date.parse(activite.depuis)));
    return {
      categorie: this.hasNonConformity(activites) ? 'NON_CONFORMITE' : 'TRAVAIL',
      dureeMs: Math.max(0, this.instants.ouverture - since),
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
          premiere: this.transition('DEBUT', premiereNonConforme),
          suivantes: activites
            .filter(activite => activite !== premiereNonConforme && activite.categorie === 'NON_CONFORMITE')
            .map(activite => this.transition('DEBUT', activite)),
        },
      };
    }
    return { kind: 'ACTIF', transitions: this.transitionAll('NON_CONFORMITE', this.etat) };
  }

  private transitionAll(type: TypeDePointage, etat: Extract<EtatDesActivites, { readonly kind: 'ACTIF' }>): LotDeTransitions {
    return {
      premiere: this.transition(type, etat.premiere),
      suivantes: etat.suivantes.map(activite => this.transition(type, activite)),
    };
  }

  private hasNonConformity(activites: readonly SuiviDuPupitre['activites'][number][]): boolean {
    return activites.some(activite => activite.categorie === 'NON_CONFORMITE');
  }

  private transition(type: TypeDePointage, activite: ActiviteDuPupitre): TransitionDePointage {
    const cible = activite.ouverture;
    const poste = activite.posteId === undefined ? {} : { posteId: activite.posteId };
    return type === 'FIN' ? { ...poste, intention: 'FIN', type, cible } : { ...poste, intention: 'TRANSITION', type, cible };
  }
}
