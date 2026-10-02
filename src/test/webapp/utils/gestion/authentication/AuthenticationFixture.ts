import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';

export class AuthenticationFixture extends AuthenticationPort {
  private token: string | undefined;
  private complete: (() => void) | undefined;
  private reject: ((failure: Error) => void) | undefined;
  private readonly arrival = new SignalFixture();
  readonly started = this.arrival.promise;
  private readonly completion = new Promise<void>((resolve, reject) => {
    this.complete = resolve;
    this.reject = reject;
  });

  override authenticate(): Promise<void> {
    this.arrival.release();
    return this.completion.then(() => {
      this.token = 'in-memory-token';
    });
  }

  override currentToken(): string | undefined {
    return this.token;
  }

  override synchronizeSession(): Promise<void> {
    return this.token === undefined ? Promise.reject(new Error('Authentication is not completed')) : Promise.resolve();
  }

  override logout(): void {
    this.token = undefined;
  }

  release(): void {
    if (this.complete === undefined) throw new Error('Authentication fixture is not initialized');
    this.complete();
  }

  refuse(): void {
    if (this.reject === undefined) throw new Error('Authentication fixture is not initialized');
    this.reject(new Error('login refused'));
  }
}

declare global {
  interface Window {
    gestionAuthenticationFixture?: AuthenticationFixture;
    gestionInitialNavigationFixture?: Promise<unknown>;
  }
}
