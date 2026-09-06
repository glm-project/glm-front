import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';

export class ErrorHandlerFixture extends ErrorHandlerPort {
  readonly errors: unknown[] = [];

  override handleError(failure: unknown): void {
    this.errors.push(failure);
  }
}
