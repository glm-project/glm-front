export abstract class AuthenticationPort {
  abstract authenticate(): Promise<void>;

  /** Nothing is a normal answer, not a failure: offline, the refresh fails and no token is current. */
  abstract currentToken(): string | undefined;

  abstract logout(): void;
}
