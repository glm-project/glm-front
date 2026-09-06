export class SignalFixture {
  private resolve: (() => void) | undefined;
  readonly promise = new Promise<void>(resolve => {
    this.resolve = resolve;
  });

  release(): void {
    if (this.resolve === undefined) throw new Error('Signal fixture is not initialized.');
    this.resolve();
  }
}
