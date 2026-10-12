import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { AtelierPort } from './contexts/atelier/domain/AtelierPort';
import { HttpAtelier } from './contexts/atelier/infrastructure/secondary/HttpAtelier';
import { CategoriesDeProduitPort } from './contexts/element-de-fabrication/domain/CategoriesDeProduitPort';
import { ElementsDeFabricationPort } from './contexts/element-de-fabrication/domain/ElementsDeFabricationPort';
import { actesDAtelierProviders } from './contexts/element-de-fabrication/infrastructure/secondary/actes-d-atelier.providers';
import { HttpCategoriesDeProduit } from './contexts/element-de-fabrication/infrastructure/secondary/HttpCategoriesDeProduit';
import { HttpElementsDeFabrication } from './contexts/element-de-fabrication/infrastructure/secondary/HttpElementsDeFabrication';

export const elementsDeFabricationProvider: Provider[] = [
  ApiClient,
  { provide: ElementsDeFabricationPort, useClass: HttpElementsDeFabrication },
  { provide: CategoriesDeProduitPort, useClass: HttpCategoriesDeProduit },
  { provide: AtelierPort, useClass: HttpAtelier },
  ...actesDAtelierProviders,
];
