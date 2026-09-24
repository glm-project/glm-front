export abstract class ErrorHandlerPort {
  abstract handleError(failure: unknown): void;

  observe(operation: Promise<void>): void {
    void operation.catch((failure: unknown) => {
      this.handleError(failure);
    });
  }
}
