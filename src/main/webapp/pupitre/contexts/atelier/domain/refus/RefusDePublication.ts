import { MotifDeRefus } from './MotifDeRefus';

export class RefusDePublication extends Error {
  readonly motif: MotifDeRefus;

  constructor(
    readonly code: string,
    message: string,
    motif: MotifDeRefus = MotifDeRefus.none(),
  ) {
    super(message);
    this.motif = motif;
  }
}
