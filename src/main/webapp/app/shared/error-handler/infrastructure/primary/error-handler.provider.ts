import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { EnvironmentProviders, ErrorHandler, makeEnvironmentProviders, provideBrowserGlobalErrorListeners, Type } from '@angular/core';
import { AngularErrorHandler } from './AngularErrorHandler';

export const provideErrorHandler = (adapter: Type<ErrorHandlerPort>): EnvironmentProviders =>
  makeEnvironmentProviders([
    { provide: ErrorHandlerPort, useClass: adapter },
    { provide: ErrorHandler, useClass: AngularErrorHandler },
    provideBrowserGlobalErrorListeners(),
  ]);
