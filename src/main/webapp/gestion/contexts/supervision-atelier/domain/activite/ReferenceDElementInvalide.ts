export class ReferenceDElementInvalide extends Error {
  constructor(readonly valeurRejetee: string) {
    super();
  }
}
