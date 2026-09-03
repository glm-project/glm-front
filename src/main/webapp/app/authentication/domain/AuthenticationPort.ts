export abstract class AuthenticationPort {
  abstract authenticate(): Promise<void>;

  abstract currentToken(): string | undefined;

  abstract logout(): void;
}
