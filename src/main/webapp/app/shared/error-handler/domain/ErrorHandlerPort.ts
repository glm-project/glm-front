export abstract class ErrorHandlerPort {
  // An adapter contains its own failures: whatever it throws or leaves rejected comes back to it through the
  // browser's global error listeners, and a report that keeps failing would feed itself.
  abstract handleError(failure: unknown): void;

  observe(operation: Promise<void>): void {
    void operation.catch((failure: unknown) => {
      this.handleError(failure);
    });
  }
}
