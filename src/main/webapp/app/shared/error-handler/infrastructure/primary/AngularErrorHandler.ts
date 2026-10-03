import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorHandler, inject, Injectable } from '@angular/core';
import { BrowserModuleRecovery } from './BrowserModuleRecovery';

@Injectable()
export class AngularErrorHandler extends ErrorHandler {
  private readonly port = inject(ErrorHandlerPort);
  private readonly recovery = inject(BrowserModuleRecovery);

  override handleError(failure: unknown): void {
    this.port.handleError(failure);
    try {
      this.recovery.recover(failure);
    } catch (recoveryFailure) {
      this.port.handleError(recoveryFailure);
    }
  }
}
