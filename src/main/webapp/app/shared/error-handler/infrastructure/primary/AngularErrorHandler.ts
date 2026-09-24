import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorHandler, inject, Injectable } from '@angular/core';

@Injectable()
export class AngularErrorHandler extends ErrorHandler {
  private readonly port = inject(ErrorHandlerPort);

  override handleError(failure: unknown): void {
    this.port.handleError(failure);
  }
}
