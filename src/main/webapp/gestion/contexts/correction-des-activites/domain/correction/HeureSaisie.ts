import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';
import { CalendrierLocal } from './CalendrierLocal';

const FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class HeureSaisie {
  private constructor(
    private readonly heures: number,
    private readonly minutes: number,
  ) {}

  static lire(texte: string): HeureSaisie | undefined {
    const parties = FORMAT.exec(texte.trim());
    return parties === null ? undefined : new HeureSaisie(Number(parties[1]), Number(parties[2]));
  }

  le(jour: JourACorriger, calendrier: CalendrierLocal): InstantDeLaJournee {
    return calendrier.instantA(jour, this.heures, this.minutes);
  }
}
