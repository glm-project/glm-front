import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';

export class ErrorHandlerFixture extends ErrorHandlerPort {
  readonly errors: unknown[] = [];
  private readonly awaiting: (() => void)[] = [];

  override handleError(failure: unknown): void {
    this.errors.push(failure);
    for (const resume of this.awaiting.splice(0)) resume();
  }

  nextFailure(): Promise<void> {
    return new Promise(resolve => {
      this.awaiting.push(resolve);
    });
  }
}
