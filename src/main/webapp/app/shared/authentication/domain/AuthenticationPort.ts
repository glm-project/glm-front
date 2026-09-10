export abstract class AuthenticationPort {
  abstract authenticate(): Promise<void>;

  abstract currentToken(): string | undefined;

  currentTenant(): string | undefined {
    return undefined;
  }

  synchronizeSession(): Promise<void> {
    return Promise.resolve();
  }

  withSession<T>(action: () => Promise<T>): Promise<T> {
    return action();
  }

  abstract logout(): void;
}
