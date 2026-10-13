import { Duree } from '../journee/Duree';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';

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
}
