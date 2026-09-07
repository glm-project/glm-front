import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { CurrentOperateurLifecycle } from '@/pupitre/contexts/atelier/application/CurrentOperateurLifecycle';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { GestesRecordingQueue } from '@/pupitre/contexts/atelier/application/GestesRecordingQueue';
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
  GestesRecordingQueue,
  EtatHorsLigneDuPupitre,
  AtelierCoordinator,
  CurrentOperateurLifecycle,
  PupitreSynchronization,
  { provide: JournauxDuPupitrePort, useClass: IndexedDbJournauxDuPupitre },
  { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
  PupitreRuntime,
  { provide: AtelierExchangePort, useClass: HttpAtelierExchange },
  { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
];
