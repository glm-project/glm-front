export class NatureDeTravailInvalide extends Error {
  constructor(readonly valeurRejetee: string) {
    super();
  }
}
