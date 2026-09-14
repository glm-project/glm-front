import { Instant } from '../instant/Instant';

export interface DescriptionSegmentDePresence {
  readonly debut: Instant;
  readonly fin: Instant;
  readonly pause: boolean;
  readonly enCours?: boolean;
}

export class SegmentDePresence {
  readonly debut: Instant;
  readonly fin: Instant;
  readonly pause: boolean;
  readonly enCours: boolean;

  constructor(description: DescriptionSegmentDePresence) {
    this.debut = description.debut;
    this.fin = description.fin;
    this.pause = description.pause;
    this.enCours = description.enCours ?? false;
  }
}
