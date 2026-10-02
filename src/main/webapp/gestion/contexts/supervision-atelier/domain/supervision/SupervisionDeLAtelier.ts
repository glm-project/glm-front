import { Instant } from '../instant/Instant';
import { COULOIRS_DE_SUPERVISION, CouloirDeSupervision } from './CouloirDeSupervision';
import { DonneesDeSupervision } from './DonneesDeSupervisionPort';
import { OperateurSupervise } from './OperateurSupervise';
import { ResultatSupervision, resultatSupervisionExploitable, resultatSupervisionInexploitable } from './ResultatSupervision';

export interface CouloirSupervise {
  readonly couloir: CouloirDeSupervision;
  readonly operateurs: readonly OperateurSupervise[];
}

export class SupervisionDeLAtelier {
  private constructor(
    readonly operateurs: readonly OperateurSupervise[],
    readonly instantDEvaluation: Instant,
  ) {}

  couloirs(): readonly CouloirSupervise[] {
    return COULOIRS_DE_SUPERVISION.map(couloir => ({
      couloir,
      operateurs: this.operateurs.filter(supervise => supervise.couloir() === couloir),
    }));
  }

  operateursEnNonConformite(): readonly OperateurSupervise[] {
    return this.operateurs.filter(supervise => supervise.isEnNonConformite());
  }

  operateursAVerifier(): readonly OperateurSupervise[] {
    return this.operateurs.filter(supervise => supervise.isAVerifier());
  }

  static determine(donnees: DonneesDeSupervision): ResultatSupervision {
    const maintenant = donnees.evaluation;
    const hasActiviteSansOperateurIdentifiable = donnees.activites.some(activite => !activite.hasOperateurIdentifiable(donnees.operateurs));
    const hasSequenceSansOperateurIdentifiable = donnees.sequencesEnConflit.some(
      sequence => !sequence.hasOperateurIdentifiable(donnees.operateurs),
    );
    const hasDonneesSansOperateurIdentifiable = hasActiviteSansOperateurIdentifiable || hasSequenceSansOperateurIdentifiable;
    if (hasDonneesSansOperateurIdentifiable) {
      return resultatSupervisionInexploitable('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
    }

    const operateurs = donnees.operateurs
      .map(operateur => {
        const activites = donnees.activites.filter(activite => activite.isFor(operateur.id));
        return new OperateurSupervise(operateur, {
          activites: activites.filter(activite => activite.isEnCours(maintenant)),
          termineesAutomatiquement: activites.filter(activite => activite.isTermineeAutomatiquement(maintenant)),
          sequencesEnConflit: donnees.sequencesEnConflit.filter(sequence => sequence.isFor(operateur.id)),
        });
      })
      .sort((left, right) => left.compareAlphabetically(right));

    return resultatSupervisionExploitable(new SupervisionDeLAtelier(operateurs, maintenant));
  }
}
