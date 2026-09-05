export class BrowserLocksFixture {
  private readonly tails = new Map<string, Promise<unknown>>();

  request<T>(name: string, action: () => Promise<T>): Promise<T> {
    const locked = (this.tails.get(name) ?? Promise.resolve()).then(action);
    this.tails.set(
      name,
      locked.catch(() => undefined),
    );
    return locked;
  }
}
