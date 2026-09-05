import { CodeDeRefusDAtelier } from './RefusDAtelier';

export class RefusDuPupitre extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly motif?: CodeDeRefusDAtelier,
  ) {
    super(message);
  }
}
