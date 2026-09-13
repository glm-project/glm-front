export class DeferredFixture<T> {
  resolve: (value: T) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  reject: (error: Error) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}
