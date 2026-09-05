import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { PupitreHorsLigne } from '@/pupitre/contexts/atelier/application/PupitreHorsLigne';
import { SynchronisationDuPupitre } from '@/pupitre/contexts/atelier/application/SynchronisationDuPupitre';
import { JournalDuPupitrePort } from '@/pupitre/contexts/atelier/domain/JournalDuPupitrePort';
import { PlanificationExpirationDesignationPort } from '@/pupitre/contexts/atelier/domain/PlanificationExpirationDesignationPort';
import { ServeurDuPupitrePort } from '@/pupitre/contexts/atelier/domain/ServeurDuPupitrePort';
import { PupitreRuntime } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/PupitreRuntime';
import { HttpServeurDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/http/HttpServeurDuPupitre';
import { JournalLocalDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/JournalLocalDuPupitre';
import { TimerPlanificationExpirationDesignation } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerPlanificationExpirationDesignation';
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
