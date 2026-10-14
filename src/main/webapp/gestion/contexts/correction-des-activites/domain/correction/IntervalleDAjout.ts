import { Duree } from '../journee/Duree';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';

export interface IntervalleCoupe {
  readonly avant: Duree;
  readonly apres: Duree | undefined;
  readonly finSurLeJour: InstantDeLaJournee;
}

const auPlusTot = (instant: InstantDeLaJournee, plafond: InstantDeLaJournee): InstantDeLaJournee =>
  instant.estAvant(plafond) ? instant : plafond;

const auPlusTard = (instant: InstantDeLaJournee, plancher: InstantDeLaJournee): InstantDeLaJournee =>
  instant.estAvant(plancher) ? plancher : instant;

export class IntervalleDAjout {
  private constructor(
    readonly debut: InstantDeLaJournee,
    readonly fin: InstantDeLaJournee,
  ) {}

  static entre(debut: InstantDeLaJournee, fin: InstantDeLaJournee): IntervalleDAjout | undefined {
    return debut.estAvant(fin) ? new IntervalleDAjout(debut, fin) : undefined;
  }

  duree(): Duree {
    return Duree.entre(this.debut, this.fin);
  }

  coupeA(coupure: InstantDeLaJournee): IntervalleCoupe {
    const finSurLeJour = auPlusTot(this.fin, coupure);
    return {
      avant: Duree.entre(auPlusTot(this.debut, coupure), finSurLeJour),
      apres: coupure.estAvant(this.fin) ? Duree.entre(auPlusTard(this.debut, coupure), this.fin) : undefined,
      finSurLeJour,
    };
  }
}
