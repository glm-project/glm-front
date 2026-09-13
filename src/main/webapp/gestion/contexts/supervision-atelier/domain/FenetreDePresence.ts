import { Instant } from './Instant';

export class FenetreDePresence {
  constructor(
    readonly debut: Instant,
    readonly fin?: Instant,
  ) {}
}
