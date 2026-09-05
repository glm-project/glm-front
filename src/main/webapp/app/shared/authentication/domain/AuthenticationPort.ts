export abstract class AuthenticationPort {
  abstract authenticate(): Promise<void>;

  abstract currentToken(): string | undefined;

  currentTenant(): string | undefined {
    return undefined;
  }

  synchronizeSession(): Promise<void> {
    return Promise.resolve();
  }

  abstract logout(): void;
}
