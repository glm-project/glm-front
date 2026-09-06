import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/DesignationExpirationSchedulerPort';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';
import { PupitreServerPort } from '@/pupitre/contexts/atelier/domain/PupitreServerPort';
import { HttpPupitreServer } from '@/pupitre/contexts/atelier/infrastructure/secondary/http/HttpPupitreServer';
import { LocalPupitreJournal } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/LocalPupitreJournal';
import { TimerDesignationExpirationScheduler } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerDesignationExpirationScheduler';
import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { Provider } from '@angular/core';

export const offlineProvider: Provider[] = [
  ApiClient,
  OfflinePupitre,
  PupitreSynchronization,
  { provide: PupitreJournalPort, useClass: LocalPupitreJournal },
  { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
  PupitreRuntime,
  { provide: PupitreServerPort, useClass: HttpPupitreServer },
];
