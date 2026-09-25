import { NatureDeTravailInvalide } from './NatureDeTravailInvalide';

export class NatureDeTravail {
  constructor(readonly value: string) {
    if (value.trim() === '') {
      throw new NatureDeTravailInvalide(value);
    }
  }
}
