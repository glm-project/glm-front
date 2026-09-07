import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Injectable } from '@angular/core';

@Injectable()
export class ConsoleErrorHandler extends ErrorHandlerPort {
  override handleError(failure: unknown): void {
    console.error(failure);
  }
}
