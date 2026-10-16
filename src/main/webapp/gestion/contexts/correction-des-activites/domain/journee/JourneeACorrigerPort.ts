import { JourACorriger } from './JourACorriger';
import { JourneeACorriger } from './JourneeACorriger';
import { OperateurDeLaJourneeId } from './OperateurDeLaJourneeId';

export abstract class JourneeACorrigerPort {
  abstract lire(operateur: OperateurDeLaJourneeId, jour: JourACorriger): Promise<JourneeACorriger | undefined>;
}
