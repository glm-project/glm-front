import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { Injectable } from '@angular/core';

export const IN_MEMORY_TOKEN = 'in-memory-token';

@Injectable()
export class InMemoryAuthentication extends AuthenticationPort {
  private token: string | undefined;

  override authenticate(): Promise<void> {
    this.token = IN_MEMORY_TOKEN;
    return Promise.resolve();
  }

  override currentToken(): string | undefined {
    return this.token;
  }

  override logout(): void {
    this.token = undefined;
  }
}
