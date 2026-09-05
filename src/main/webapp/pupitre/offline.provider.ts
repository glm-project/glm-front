import { PupitreHorsLigne } from '@/app/atelier/application/PupitreHorsLigne';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { PupitreRuntime } from '@/app/atelier/infrastructure/primary/pupitre/PupitreRuntime';
import { HttpServeurDuPupitre } from '@/app/atelier/infrastructure/secondary/http/HttpServeurDuPupitre';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { Provider } from '@angular/core';

export const offlineProvider: Provider[] = [
  ClientApi,
  PupitreHorsLigne,
  PupitreRuntime,
  { provide: ServeurDuPupitrePort, useClass: HttpServeurDuPupitre },
];
