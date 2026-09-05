export class SignalFixture {
  private resolve!: () => void;
  readonly promise = new Promise<void>(resolve => {
    this.resolve = resolve;
  });

  release(): void {
    this.resolve();
  }
}
