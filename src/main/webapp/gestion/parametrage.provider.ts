import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { ParametragePort } from './contexts/parametrage/domain/ParametragePort';
import { HttpParametrage } from './contexts/parametrage/infrastructure/secondary/HttpParametrage';

export const parametrageProvider: Provider[] = [ApiClient, { provide: ParametragePort, useClass: HttpParametrage }];
