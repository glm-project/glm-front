import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { EnregistrementDeFichierPort } from '@/gestion/shared/enregistrement-de-fichier/domain/EnregistrementDeFichierPort';
import { EnregistrementDansLeNavigateur } from '@/gestion/shared/enregistrement-de-fichier/infrastructure/secondary/EnregistrementDansLeNavigateur';
import { Provider } from '@angular/core';
import { CoutDeRevientPort } from './contexts/cout-de-revient/domain/rapport/CoutDeRevientPort';
import { HttpCoutDeRevient } from './contexts/cout-de-revient/infrastructure/secondary/HttpCoutDeRevient';

export const coutDeRevientProvider: Provider[] = [
  ApiClient,
  { provide: CoutDeRevientPort, useClass: HttpCoutDeRevient },
  { provide: EnregistrementDeFichierPort, useClass: EnregistrementDansLeNavigateur },
];
