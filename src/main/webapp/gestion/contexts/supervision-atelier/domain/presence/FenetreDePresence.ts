import { Instant } from '../instant/Instant';

export class FenetreDePresence {
  constructor(
    readonly debut: Instant,
    readonly fin?: Instant,
  ) {}
}
