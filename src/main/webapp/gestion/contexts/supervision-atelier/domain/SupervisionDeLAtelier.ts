import { EtatDePresence } from './EtatDePresence';
import { JourneeDeTravail } from './JourneeDeTravail';
import { OperateurDeclare } from './OperateurDeclare';
import { OperateurSupervise } from './OperateurSupervise';

export class SupervisionDeLAtelier {
  private constructor(readonly operateurs: readonly OperateurSupervise[]) {}

  static determine(operateursDeclares: readonly OperateurDeclare[], journees: readonly JourneeDeTravail[]): SupervisionDeLAtelier {
    const operateurs = operateursDeclares
      .map(operateur => {
        const journeeOuverte = journees.find(journee => journee.isOpenFor(operateur.id));
        const presence: EtatDePresence = journeeOuverte?.session ?? 'ABSENT';
        return new OperateurSupervise(operateur, presence);
      })
      .sort((left, right) => left.compareAlphabetically(right));

    return new SupervisionDeLAtelier(operateurs);
  }
}
