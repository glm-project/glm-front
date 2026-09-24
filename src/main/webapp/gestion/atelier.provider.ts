import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { AtelierPort } from './contexts/atelier/domain/AtelierPort';
import { ElementsEngageablesPort } from './contexts/atelier/domain/ElementsEngageablesPort';
import { HttpAtelier } from './contexts/atelier/infrastructure/secondary/HttpAtelier';
import { HttpElementsEngageables } from './contexts/atelier/infrastructure/secondary/HttpElementsEngageables';

export const atelierProvider: Provider[] = [
  ApiClient,
  { provide: AtelierPort, useClass: HttpAtelier },
  { provide: ElementsEngageablesPort, useClass: HttpElementsEngageables },
];
