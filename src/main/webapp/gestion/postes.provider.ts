import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { PostesPort } from './contexts/poste/domain/PostesPort';
import { HttpPostes } from './contexts/poste/infrastructure/secondary/HttpPostes';

export const postesProvider: Provider[] = [ApiClient, { provide: PostesPort, useClass: HttpPostes }];
