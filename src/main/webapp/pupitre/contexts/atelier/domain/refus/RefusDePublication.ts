import { CodeDeRefusDAtelier } from './RefusDAtelier';

export class RefusDePublication extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly motif?: CodeDeRefusDAtelier,
  ) {
    super(message);
  }
}
