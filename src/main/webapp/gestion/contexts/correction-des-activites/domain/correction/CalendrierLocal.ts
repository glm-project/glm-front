import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';

export interface CalendrierLocal {
  instantA(jour: JourACorriger, heures: number, minutes: number): InstantDeLaJournee;
}
