import { CodeDeRefusDAtelier, MotifDeRefus } from './MotifDeRefus';

export class RefusDAtelier extends Error {
  readonly motif: MotifDeRefus;

  constructor(code: CodeDeRefusDAtelier, message: string) {
    super(message);
    this.motif = MotifDeRefus.from(code);
  }
}
