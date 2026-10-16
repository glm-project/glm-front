import { Duree } from './Duree';
import { JourACorriger } from './JourACorriger';

export class PortionDeJour {
  constructor(
    readonly jour: JourACorriger,
    readonly duree: Duree,
  ) {}
}
