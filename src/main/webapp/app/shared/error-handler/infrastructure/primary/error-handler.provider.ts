import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Provider, Type } from '@angular/core';

export const provideErrorHandler = (adapter: Type<ErrorHandlerPort>): Provider[] => [{ provide: ErrorHandlerPort, useClass: adapter }];
