import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { Provider } from '@angular/core';
import { OperateursPort } from './contexts/operateur/domain/OperateursPort';
import { HttpOperateurs } from './contexts/operateur/infrastructure/secondary/HttpOperateurs';

export const operateursProvider: Provider[] = [
  ApiClient,
  { provide: OperateursPort, useClass: HttpOperateurs },
  { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
];
