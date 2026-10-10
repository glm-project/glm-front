import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Provider } from '@angular/core';
import { EnregistrementDeFichierPort } from './contexts/cout-de-revient/domain/export/EnregistrementDeFichierPort';
import { CoutDeRevientPort } from './contexts/cout-de-revient/domain/rapport/CoutDeRevientPort';
import { EnregistrementDansLeNavigateur } from './contexts/cout-de-revient/infrastructure/secondary/EnregistrementDansLeNavigateur';
import { HttpCoutDeRevient } from './contexts/cout-de-revient/infrastructure/secondary/HttpCoutDeRevient';

export const coutDeRevientProvider: Provider[] = [
  ApiClient,
  { provide: CoutDeRevientPort, useClass: HttpCoutDeRevient },
  { provide: EnregistrementDeFichierPort, useClass: EnregistrementDansLeNavigateur },
];
