export class InstantInvalide extends Error {
  constructor(readonly valeurRejetee: string) {
    super();
  }
}
