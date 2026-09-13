import { EtatDePresence } from './EtatDePresence';
import { JourneeDeTravail } from './JourneeDeTravail';
import { OperateurDeclare } from './OperateurDeclare';
import { OperateurSupervise } from './OperateurSupervise';
import { ResultatSupervision, resultatSupervisionExploitable } from './ResultatSupervision';

export class SupervisionDeLAtelier {
  private constructor(readonly operateurs: readonly OperateurSupervise[]) {}

  static determine(operateursDeclares: readonly OperateurDeclare[], journees: readonly JourneeDeTravail[]): ResultatSupervision {
    const operateurs = operateursDeclares
      .map(operateur => {
        const journeeOuverte = journees.find(journee => journee.isOpenFor(operateur.id));
        const presence: EtatDePresence = journeeOuverte?.session ?? 'ABSENT';
        return new OperateurSupervise(operateur, presence);
      })
      .sort((left, right) => left.compareAlphabetically(right));

    return resultatSupervisionExploitable(new SupervisionDeLAtelier(operateurs));
  }
}
