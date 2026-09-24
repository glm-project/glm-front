import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorHandler, Provider, Type } from '@angular/core';
import { AngularErrorHandler } from './AngularErrorHandler';

export const provideErrorHandler = (adapter: Type<ErrorHandlerPort>): Provider[] => [
  { provide: ErrorHandlerPort, useClass: adapter },
  { provide: ErrorHandler, useClass: AngularErrorHandler },
];
