import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { Provider } from '@angular/core';
import { PostesCoordinator } from './contexts/poste/application/PostesCoordinator';
import { PostesPort } from './contexts/poste/domain/PostesPort';
import { HttpPostes } from './contexts/poste/infrastructure/secondary/HttpPostes';

export const postesProvider: Provider[] = [
  ApiClient,
  PostesCoordinator,
  { provide: PostesPort, useClass: HttpPostes },
  { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
];
