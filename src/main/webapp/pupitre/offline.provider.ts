import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/DesignationExpirationSchedulerPort';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';
import { PupitreServerPort } from '@/pupitre/contexts/atelier/domain/PupitreServerPort';
import { PupitreSynchronizationTrigger } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/PupitreSynchronizationTrigger';
import { HttpPupitreServer } from '@/pupitre/contexts/atelier/infrastructure/secondary/http/HttpPupitreServer';
import { LocalPupitreJournal } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/LocalPupitreJournal';
import { TimerDesignationExpirationScheduler } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerDesignationExpirationScheduler';
import { Provider } from '@angular/core';

export const offlineProvider: Provider[] = [
  ApiClient,
  OfflinePupitre,
  PupitreSynchronization,
  { provide: PupitreJournalPort, useClass: LocalPupitreJournal },
  { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
  PupitreSynchronizationTrigger,
  { provide: PupitreServerPort, useClass: HttpPupitreServer },
];
