import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { HttpAtelierExchange } from '@/pupitre/contexts/atelier/infrastructure/secondary/http/HttpAtelierExchange';
import { IndexedDbJournauxDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/IndexedDbJournauxDuPupitre';
import { TimerDesignationExpirationScheduler } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerDesignationExpirationScheduler';
import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { Provider } from '@angular/core';

export const offlineProvider: Provider[] = [
  ApiClient,
  OfflinePupitre,
  PupitreSynchronization,
  { provide: JournauxDuPupitrePort, useClass: IndexedDbJournauxDuPupitre },
  { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
  PupitreRuntime,
  { provide: AtelierExchangePort, useClass: HttpAtelierExchange },
];
