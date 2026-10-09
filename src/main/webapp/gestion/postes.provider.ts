import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { NaturesDeTravailPort } from './contexts/poste/domain/NaturesDeTravailPort';
import { PostesPort } from './contexts/poste/domain/PostesPort';
import { HttpNaturesDeTravail } from './contexts/poste/infrastructure/secondary/HttpNaturesDeTravail';
import { HttpPostes } from './contexts/poste/infrastructure/secondary/HttpPostes';

export const postesProvider: Provider[] = [
  ApiClient,
  { provide: PostesPort, useClass: HttpPostes },
  { provide: NaturesDeTravailPort, useClass: HttpNaturesDeTravail },
];
