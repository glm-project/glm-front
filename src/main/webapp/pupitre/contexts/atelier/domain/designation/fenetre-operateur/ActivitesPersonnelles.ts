import { ActiviteDuPupitre, SuiviDuPupitre, TypeDePointage, TypeDOuverture } from '../../journal-du-pupitre/JournalDuPupitre';
import { CibleDePointage } from './DecisionDePointage';
import { OperateurDesigne } from './OperateurDesigne';
import { LotDePointagesDemandes, PointageDemande } from './PointageDemande';
import { ActiviteDePointage } from './VueDePointage';

type EtatDesActivites =
  | { readonly kind: 'INACTIF' }
  | {
      readonly kind: 'ACTIF';
      readonly premiere: SuiviDuPupitre['activites'][number];
      readonly suivantes: readonly SuiviDuPupitre['activites'][number][];
    };

type DecisionDesActivites = { readonly kind: 'INACTIF' } | { readonly kind: 'ACTIF'; readonly pointages: LotDePointagesDemandes };

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
    return { kind: 'ACTIF', pointages: this.pointagesPour(cible, activites) };
  }

  private pointagesPour(cible: CibleDePointage, activites: readonly ActiviteDuPupitre[]): LotDePointagesDemandes {
    if (cible === 'PRINCIPALE') return activites.map(activite => this.pointage('FIN', activite));
    const nonConformes = activites.filter(activite => activite.categorie === 'NON_CONFORMITE');
    return nonConformes.length > 0
      ? this.finsSuiviesDUneOuverture('DEBUT', nonConformes)
      : this.finsSuiviesDUneOuverture('NON_CONFORMITE', activites);
  }

  private finsSuiviesDUneOuverture(ouverture: TypeDOuverture, activites: readonly ActiviteDuPupitre[]): LotDePointagesDemandes {
    return activites.flatMap(activite => [this.pointage('FIN', activite), this.pointage(ouverture, activite)]);
  }

  private hasNonConformity(activites: readonly SuiviDuPupitre['activites'][number][]): boolean {
    return activites.some(activite => activite.categorie === 'NON_CONFORMITE');
  }

  private pointage(type: TypeDePointage, activite: ActiviteDuPupitre): PointageDemande {
    return activite.posteId === undefined ? { type } : { type, posteId: activite.posteId };
  }
}
