import { PupitreHorsLigne } from '@/app/atelier/application/PupitreHorsLigne';
import { SynchronisationDuPupitre } from '@/app/atelier/application/SynchronisationDuPupitre';
import { JournalDuPupitrePort } from '@/app/atelier/domain/JournalDuPupitrePort';
import { PlanificationExpirationDesignationPort } from '@/app/atelier/domain/PlanificationExpirationDesignationPort';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { PupitreRuntime } from '@/app/atelier/infrastructure/primary/pupitre/PupitreRuntime';
import { HttpServeurDuPupitre } from '@/app/atelier/infrastructure/secondary/http/HttpServeurDuPupitre';
import { JournalLocalDuPupitre } from '@/app/atelier/infrastructure/secondary/local/JournalLocalDuPupitre';
import { TimerPlanificationExpirationDesignation } from '@/app/atelier/infrastructure/secondary/TimerPlanificationExpirationDesignation';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { Provider } from '@angular/core';

export const offlineProvider: Provider[] = [
  ClientApi,
  PupitreHorsLigne,
  SynchronisationDuPupitre,
  { provide: JournalDuPupitrePort, useClass: JournalLocalDuPupitre },
  { provide: PlanificationExpirationDesignationPort, useClass: TimerPlanificationExpirationDesignation },
  PupitreRuntime,
  { provide: ServeurDuPupitrePort, useClass: HttpServeurDuPupitre },
];
