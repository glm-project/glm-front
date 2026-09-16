import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { Provider } from '@angular/core';
import { ElementsDeFabricationPort } from './contexts/element-de-fabrication/domain/ElementsDeFabricationPort';
import { HttpElementsDeFabrication } from './contexts/element-de-fabrication/infrastructure/secondary/HttpElementsDeFabrication';

export const elementsDeFabricationProvider: Provider[] = [
  ApiClient,
  { provide: ElementsDeFabricationPort, useClass: HttpElementsDeFabrication },
  { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
];
