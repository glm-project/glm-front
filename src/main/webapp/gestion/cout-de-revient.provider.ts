import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { Provider } from '@angular/core';
import { CoutDeRevientPort } from './contexts/cout-de-revient/domain/rapport/CoutDeRevientPort';
import { HttpCoutDeRevient } from './contexts/cout-de-revient/infrastructure/secondary/HttpCoutDeRevient';

export const coutDeRevientProvider: Provider[] = [
  ApiClient,
  { provide: CoutDeRevientPort, useClass: HttpCoutDeRevient },
  { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
];
