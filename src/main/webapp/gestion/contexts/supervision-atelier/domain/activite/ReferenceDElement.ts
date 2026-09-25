import { ReferenceDElementInvalide } from './ReferenceDElementInvalide';

export class ReferenceDElement {
  constructor(readonly value: string) {
    if (value.trim() === '') {
      throw new ReferenceDElementInvalide(value);
    }
  }
}
