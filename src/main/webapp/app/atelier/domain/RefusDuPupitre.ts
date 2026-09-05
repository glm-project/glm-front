export class RefusDuPupitre extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
