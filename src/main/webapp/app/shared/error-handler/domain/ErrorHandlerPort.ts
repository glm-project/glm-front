export abstract class ErrorHandlerPort {
  abstract handleError(failure: unknown): void;
}
