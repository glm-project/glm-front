import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { CurrentOperateurLifecycle } from '@/pupitre/contexts/atelier/application/CurrentOperateurLifecycle';
import { EffacementDesJournaux } from '@/pupitre/contexts/atelier/application/EffacementDesJournaux';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { FraicheurDuReferentiel } from '@/pupitre/contexts/atelier/application/FraicheurDuReferentiel';
import { GestesRecordingQueue } from '@/pupitre/contexts/atelier/application/GestesRecordingQueue';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { ActiviteExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/ActiviteExpirationSchedulerPort';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { EffacementDesJournauxPort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/EffacementDesJournauxPort';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { HttpAtelierExchange } from '@/pupitre/contexts/atelier/infrastructure/secondary/http/HttpAtelierExchange';
import { IndexedDbEffacementDesJournaux } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/IndexedDbEffacementDesJournaux';
import { IndexedDbJournauxDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/IndexedDbJournauxDuPupitre';
import { TimerDesignationExpirationScheduler } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerDesignationExpirationScheduler';
import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { PupitreVersionUpdater } from '@/pupitre/PupitreVersionUpdater';
import { Provider } from '@angular/core';

export const offlineProvider: Provider[] = [
  ApiClient,
  GestesRecordingQueue,
  EtatHorsLigneDuPupitre,
  FraicheurDuReferentiel,
  AtelierCoordinator,
  CurrentOperateurLifecycle,
  PupitreSynchronization,
  EffacementDesJournaux,
  { provide: JournauxDuPupitrePort, useClass: IndexedDbJournauxDuPupitre },
  { provide: EffacementDesJournauxPort, useClass: IndexedDbEffacementDesJournaux },
  { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
  { provide: ActiviteExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
  PupitreRuntime,
  PupitreVersionUpdater,
  { provide: AtelierExchangePort, useClass: HttpAtelierExchange },
];
