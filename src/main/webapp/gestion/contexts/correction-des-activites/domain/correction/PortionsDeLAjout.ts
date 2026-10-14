import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';
import { PortionDeJour } from '../journee/PortionDeJour';
import { IntervalleDAjout } from './IntervalleDAjout';

export class PortionsDeLAjout {
  readonly duJourAffiche: PortionDeJour;
  readonly duLendemain: PortionDeJour | undefined;
  readonly finSurLeJourAffiche: InstantDeLaJournee;

  constructor(
    readonly intervalle: IntervalleDAjout,
    jourAffiche: JourACorriger,
    finDuJourAffiche: InstantDeLaJournee,
  ) {
    const coupe = intervalle.coupeA(finDuJourAffiche);
    this.duJourAffiche = new PortionDeJour(jourAffiche, coupe.avant);
    this.duLendemain = coupe.apres === undefined ? undefined : new PortionDeJour(jourAffiche.lendemain(), coupe.apres);
    this.finSurLeJourAffiche = coupe.finSurLeJour;
  }
}
