import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { ElementsDeFabricationPort } from './contexts/element-de-fabrication/domain/ElementsDeFabricationPort';
import { HttpElementsDeFabrication } from './contexts/element-de-fabrication/infrastructure/secondary/HttpElementsDeFabrication';

export const elementsDeFabricationProvider: Provider[] = [
  ApiClient,
  { provide: ElementsDeFabricationPort, useClass: HttpElementsDeFabrication },
];
