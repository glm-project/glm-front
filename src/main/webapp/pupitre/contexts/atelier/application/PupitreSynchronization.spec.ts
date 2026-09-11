import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDAtelier,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { MotifDeRefus } from '@/pupitre/contexts/atelier/domain/refus/MotifDeRefus';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { Injector } from '@angular/core';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { DeviceSessionFixture } from '@test/unit/fixtures/pupitre/DeviceSessionFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { PupitreSynchronization } from './PupitreSynchronization';

const referenceFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };
const gesteFixture: GesteDAtelier = { id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean', nature: 'ARRIVEE' };
const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

class ServerFixture extends AtelierExchangePort {
  readonly received: GesteDAtelier[] = [];
  readonly rereadGestes: GesteDAtelier[] = [];
  referentielCalls = 0;
  onReferentiel: (() => Promise<ReferentielDuPupitre> | ReferentielDuPupitre) | undefined;
  onSend: ((geste: GesteDAtelier) => Promise<void> | void) | undefined;

  override async referentiel(): Promise<ReferentielDuPupitre> {
    await roundTrip();
    this.referentielCalls++;
    if (this.onReferentiel !== undefined) {
      return this.onReferentiel();
    }
    return referenceFixture;
  }

  override async send(geste: GesteDAtelier): Promise<void> {
    await roundTrip();
    if (this.onSend !== undefined) {
      await this.onSend(geste);
    }
    this.received.push(structuredClone(geste));
  }

  override async reread(geste: GesteDAtelier): Promise<void> {
    await roundTrip();
    this.rereadGestes.push(structuredClone(geste));
  }
}

class JournalBarrierFixture {
  private readonly arrival = new SignalFixture();
  private readonly continuation = new SignalFixture();
  readonly reached = this.arrival.promise;

  async hold(): Promise<void> {
    this.arrival.release();
    await this.continuation.promise;
  }

  release(): void {
    this.continuation.release();
  }
}

class SynchronizationJournalFixture extends JournauxDuPupitrePort {
  private readonly stored = new JournauxDuPupitreFixture();
  private nextRelease: JournalBarrierFixture | undefined;
  private nextRead: JournalBarrierFixture | undefined;
  unavailable = false;

  holdNextSynchronizationRelease(): JournalBarrierFixture {
    const barrier = new JournalBarrierFixture();
    this.nextRelease = barrier;
    return barrier;
  }

  holdNextRead(): JournalBarrierFixture {
    const barrier = new JournalBarrierFixture();
    this.nextRead = barrier;
    return barrier;
  }

  override async read(entreprise: Entreprise): Promise<JournalDuPupitre> {
    const barrier = this.nextRead;
    this.nextRead = undefined;
    await barrier?.hold();
    return this.stored.read(entreprise);
  }

  override append(entreprise: Entreprise, gestes: readonly GesteDAtelier[]): Promise<void> {
    return this.stored.append(entreprise, gestes);
  }

  override saveReferentiel(entreprise: Entreprise, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre> {
    return this.stored.saveReferentiel(entreprise, referentiel);
  }

  override saveResult(entreprise: Entreprise, resultat: EvenementDuJournal): Promise<JournalDuPupitre> {
    return this.stored.saveResult(entreprise, resultat);
  }

  override markDisconnected(entreprise: Entreprise): Promise<JournalDuPupitre> {
    return this.stored.markDisconnected(entreprise);
  }

  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.stored.synchronize(async () => {
      await roundTrip();
      if (this.unavailable) {
        throw new Error('stockage indisponible');
      }
      const result = await action();
      const barrier = this.nextRelease;
      this.nextRelease = undefined;
      await barrier?.hold();
      return result;
    });
  }
}

describe('PupitreSynchronization', () => {
  let journal: SynchronizationJournalFixture;
  let server: ServerFixture;
  let synchronisation: PupitreSynchronization;
  let exposed: JournalDuPupitre | undefined;
  let tenant: string | undefined;
  let token: string | undefined;
  let onSynchronizeSession: (() => Promise<void> | void) | undefined;
  let errorHandler: ErrorHandlerFixture;

  beforeEach(() => {
    journal = new SynchronizationJournalFixture();
    server = new ServerFixture();
    errorHandler = new ErrorHandlerFixture();
    exposed = undefined;
    tenant = 'entreprise-a';
    token = undefined;
    onSynchronizeSession = undefined;
    synchronisation = Injector.create({
      providers: [
        PupitreSynchronization,
        { provide: JournauxDuPupitrePort, useValue: journal },
        { provide: AtelierExchangePort, useValue: server },
        { provide: ErrorHandlerPort, useValue: errorHandler },
        {
          provide: AuthenticationPort,
          useValue: {
            synchronizeSession: async () => {
              await roundTrip();
              if (onSynchronizeSession !== undefined) {
                await onSynchronizeSession();
              }
            },
            currentTenant: () => tenant,
            currentToken: () => token,
          },
        },
        { provide: DeviceSessionPort, useClass: DeviceSessionFixture },
      ],
    }).get(PupitreSynchronization);
  });

  it('should restore the selected company without attempting to exchange its pending gestures when authorization expired', async () => {
    await givenASelectedCompanyWithPendingWork();

    await whenSynchronizing();

    thenPendingWorkRemainsAvailable();
    thenServerReceived();
  });

  it('should retry pending work after storage synchronization recovers', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenUnavailableStorage();

    const synchronization = whenSynchronizing();

    await thenSynchronizationFails(synchronization);
    whenStorageRecovers();

    await whenSynchronizing();

    thenServerReceived(gesteFixture);
  });

  it('should refresh the referential into the journal and publish it when authorized', async () => {
    givenAnAuthorizedSession();

    await whenSynchronizing();

    thenReferentialRefreshedOnce();
  });

  it('should coalesce concurrent synchronization requests into a single sequential replay', async () => {
    givenAnAuthorizedSession();
    givenSlowReferentialExchange();

    const first = whenSynchronizing();
    const second = whenSynchronizing();
    await Promise.all([first, second]);

    thenReferentialRefreshedTwice();
  });

  it('should reconcile every concurrent caller with the refreshed journal', async () => {
    givenAnAuthorizedSession();
    const firstStates: JournalDuPupitre[] = [];
    const secondStates: JournalDuPupitre[] = [];

    await Promise.all([whenSynchronizingInto(firstStates), whenSynchronizingInto(secondStates)]);

    expect(firstStates.at(-1)?.referentiel).toEqual(referenceFixture);
    expect(secondStates.at(-1)?.referentiel).toEqual(referenceFixture);
  });

  it('should continue notifying remaining publishers when one throws', async () => {
    givenAnAuthorizedSession();
    const failingCaller = whenSynchronizingWithFailingPublisher();
    const secondStates: JournalDuPupitre[] = [];
    const successfulCaller = whenSynchronizingInto(secondStates);

    await Promise.all([failingCaller, successfulCaller]);

    expect(secondStates.at(-1)?.referentiel).toEqual(referenceFixture);
    thenAnErrorWasReported();
  });

  it('should exchange work requested while the synchronization lock is being released', async () => {
    givenAnAuthorizedSession();
    const lateStates: JournalDuPupitre[] = [];
    const synchronization = await givenSynchronizationIsReleasingItsLock();

    await whenAddingWorkAndSynchronizingDuringRelease(synchronization, lateStates);

    thenServerReceived(gesteFixture);
    expect(lateStates.at(-1)?.evenements[0]?.etat).toBe('ACCEPTE');
  });

  it('should discard refreshed referential if the company changed during server exchange', async () => {
    givenAnAuthorizedSession();
    givenSessionCompanySwitchesDuringReferentialRefresh();

    await whenSynchronizing();

    await thenCompanyReferentialWasNotOverwritten('entreprise-a');
  });

  it('should discard refreshed referential if the token changed during server exchange', async () => {
    givenAnAuthorizedSession();
    givenSessionTokenSwitchesDuringReferentialRefresh();

    await whenSynchronizing();

    await thenCompanyReferentialWasNotOverwritten('entreprise-a');
  });

  it('should retain existing state and log an error when referential refresh fails', async () => {
    await journal.saveReferentiel(Entreprise.of('entreprise-a'), referenceFixture);
    givenAnAuthorizedSession();
    givenFailedReferentialExchange();

    await whenSynchronizing();

    thenReferentialFailureWasLogged();
    thenExistingStatePreserved();
  });

  it('should stop draining when authorization token expires during replay', async () => {
    await givenCompanyWithTwoPendingGestures();
    givenAnAuthorizedSession();
    givenSessionTokenExpiresOnFirstReplay();

    await whenSynchronizing();

    thenServerReceived(gesteFixture);
    thenReferentialNeverRefreshed();
  });

  it('should stop draining and abort referential refresh when company changes during replay', async () => {
    await givenCompanyWithTwoPendingGestures();
    givenAnAuthorizedSession();
    givenCompanyChangesOnFirstReplay();

    await whenSynchronizing();

    thenServerReceived(gesteFixture);
    thenReferentialNeverRefreshed();
    thenDrainingStoppedWithoutDisconnection();
  });

  it('should stop exchange when company is deselected during journal read', async () => {
    await givenASelectedCompanyWithPendingWork();
    const synchronization = await givenSynchronizationIsReadingTheJournal();

    await whenDeselectingCompanyDuringRead(synchronization);

    thenReferentialNeverRefreshed();
  });

  it('should record an arrival as accepted with journeeOuverte false when already opened', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenArrivalAlreadyOpened();

    await whenSynchronizing();

    thenEventAcceptedWithoutOpeningDay();
  });

  it('should record an arrival as accepted with journeeOuverte true when first opened', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();

    await whenSynchronizing();

    thenEventAcceptedWithOpeningDay();
  });

  it('should reread and retry once when server reports concurrent modification', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenConcurrentModificationOnFirstAttempt();

    await whenSynchronizing();

    thenServerReceived(gesteFixture);
    thenServerReread(gesteFixture);
    thenEventAcceptedWithOpeningDay();
  });

  it('should absorb duplicate arrival during concurrent retry', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenConcurrentModificationFollowedByAlreadyOpenedArrival();

    await whenSynchronizing();

    thenEventAcceptedWithoutOpeningDay();
    thenServerReread(gesteFixture);
  });

  it('should record business refusal when server refuses gesture', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenUnauthorizedGestureRefusal();

    await whenSynchronizing();

    thenEventRefused('refus-invalide', 'Opérateur non habilité');
  });

  it('should mark disconnected when unexpected technical failure occurs during exchange', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenTechnicalFailureDuringSend();

    await whenSynchronizing();

    thenDisconnectedStatusObserved();
  });

  it('should mark disconnected when authorization changes before push', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenSessionTokenExpiresBeforePush();

    await whenSynchronizing();

    thenDisconnectedStatusObserved();
  });

  it('should mark disconnected when authorization changes during retry reread', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenSessionTokenExpiresDuringConcurrentRetry();

    await whenSynchronizing();

    thenDisconnectedStatusObserved();
    thenServerReread();
  });

  const givenSynchronizationIsReleasingItsLock = async () => {
    const barrier = journal.holdNextSynchronizationRelease();
    const completion = whenSynchronizing();
    await barrier.reached;
    return { barrier, completion };
  };
  const whenAddingWorkAndSynchronizingDuringRelease = async (
    synchronization: { barrier: JournalBarrierFixture; completion: Promise<void> },
    states: JournalDuPupitre[],
  ): Promise<void> => {
    await journal.append(Entreprise.of('entreprise-a'), [gesteFixture]);
    const late = whenSynchronizingInto(states);
    synchronization.barrier.release();
    await Promise.all([synchronization.completion, late]);
  };
  const givenSynchronizationIsReadingTheJournal = async () => {
    const barrier = journal.holdNextRead();
    const completion = whenSynchronizing();
    await barrier.reached;
    return { barrier, completion };
  };
  const whenDeselectingCompanyDuringRead = async (synchronization: {
    barrier: JournalBarrierFixture;
    completion: Promise<void>;
  }): Promise<void> => {
    whenDeselectingCompany();
    synchronization.barrier.release();
    await synchronization.completion;
  };
  const whenSynchronizingInto = (states: JournalDuPupitre[]): Promise<void> =>
    synchronisation.synchronize((_entreprise, state) => {
      states.push(state);
    });
  const whenSynchronizingWithFailingPublisher = (): Promise<void> =>
    synchronisation.synchronize(() => {
      throw new Error('publisher failed');
    });
  const givenASelectedCompanyWithPendingWork = async (): Promise<void> => {
    await journal.saveReferentiel(Entreprise.of('entreprise-a'), referenceFixture);
    await journal.append(Entreprise.of('entreprise-a'), [gesteFixture]);
  };
  const givenCompanyWithTwoPendingGestures = async (): Promise<void> => {
    const secondGeste: GesteDAtelier = { ...gesteFixture, id: 'geste-2' };
    await journal.saveReferentiel(Entreprise.of('entreprise-a'), referenceFixture);
    await journal.append(Entreprise.of('entreprise-a'), [gesteFixture, secondGeste]);
  };
  const givenAnAuthorizedSession = (): void => {
    token = 'autorise';
  };
  const givenUnavailableStorage = (): void => {
    journal.unavailable = true;
  };
  const givenSlowReferentialExchange = (): void => {
    let callCount = 0;
    server.onReferentiel = async (): Promise<ReferentielDuPupitre> => {
      callCount++;
      if (callCount === 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return referenceFixture;
    };
  };
  const givenSessionCompanySwitchesDuringReferentialRefresh = (): void => {
    server.onReferentiel = (): ReferentielDuPupitre => {
      tenant = 'entreprise-b';
      return { operateurs: [{ id: 'autre', matricule: '9999', nom: 'Autre', prenom: 'Op', postes: [] }], suivis: [] };
    };
  };
  const givenSessionTokenSwitchesDuringReferentialRefresh = (): void => {
    server.onReferentiel = (): ReferentielDuPupitre => {
      token = 'autre-token';
      return { operateurs: [{ id: 'autre', matricule: '9999', nom: 'Autre', prenom: 'Op', postes: [] }], suivis: [] };
    };
  };
  const givenFailedReferentialExchange = (): void => {
    server.onReferentiel = (): ReferentielDuPupitre => {
      throw new Error('reseau indisponible');
    };
  };
  const givenSessionTokenExpiresOnFirstReplay = (): void => {
    server.onSend = (): void => {
      token = undefined;
    };
  };
  const givenCompanyChangesOnFirstReplay = (): void => {
    server.onSend = (): void => {
      tenant = 'entreprise-b';
    };
  };
  const whenDeselectingCompany = (): void => {
    tenant = undefined;
  };
  const givenArrivalAlreadyOpened = (): void => {
    server.onSend = (): void => {
      throw new RefusDePublication('refus-1', 'Journée déjà ouverte', MotifDeRefus.from('journee-de-travail-deja-ouverte'));
    };
  };
  const givenConcurrentModificationOnFirstAttempt = (): void => {
    let attempts = 0;
    server.onSend = (): void => {
      attempts++;
      if (attempts === 1) {
        throw new RefusDePublication('concurrence', 'Concurrence', MotifDeRefus.from('saisie-concurrente'));
      }
    };
  };
  const givenConcurrentModificationFollowedByAlreadyOpenedArrival = (): void => {
    let attempts = 0;
    server.onSend = (): void => {
      attempts++;
      if (attempts === 1) {
        throw new RefusDePublication('concurrence', 'Concurrence', MotifDeRefus.from('saisie-concurrente'));
      }
      throw new RefusDePublication('refus-2', 'Journée déjà ouverte', MotifDeRefus.from('journee-de-travail-deja-ouverte'));
    };
  };
  const givenUnauthorizedGestureRefusal = (): void => {
    server.onSend = (): void => {
      throw new RefusDePublication('refus-invalide', 'Opérateur non habilité');
    };
  };
  const givenTechnicalFailureDuringSend = (): void => {
    server.onSend = (): void => {
      throw new Error('Erreur réseau');
    };
  };
  const givenSessionTokenExpiresBeforePush = (): void => {
    let sessionCount = 0;
    onSynchronizeSession = (): void => {
      sessionCount++;
      if (sessionCount > 1) {
        token = undefined;
      }
    };
  };
  const givenSessionTokenExpiresDuringConcurrentRetry = (): void => {
    let attempts = 0;
    server.onSend = (): void => {
      attempts++;
      if (attempts === 1) {
        token = undefined;
        throw new RefusDePublication('concurrence', 'Concurrence', MotifDeRefus.from('saisie-concurrente'));
      }
    };
  };

  const whenSynchronizing = (): Promise<void> =>
    synchronisation.synchronize((_entreprise, state) => {
      exposed = state;
    });
  const whenStorageRecovers = (): void => {
    journal.unavailable = false;
  };

  const thenPendingWorkRemainsAvailable = (): void => {
    expect(exposed).toEqual({
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: referenceFixture,
      evenements: [{ geste: gesteFixture, etat: 'EN_ATTENTE' }],
    });
  };
  const thenExistingStatePreserved = (): void => {
    expect(exposed).toEqual({
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: referenceFixture,
    });
  };
  const thenSynchronizationFails = async (synchronization: Promise<void>): Promise<void> => {
    await expect(synchronization).rejects.toThrow('stockage indisponible');
  };
  const thenServerReceived = (...gestes: GesteDAtelier[]): void => {
    expect(server.received).toEqual(gestes);
  };
  const thenServerReread = (...gestes: GesteDAtelier[]): void => {
    expect(server.rereadGestes).toEqual(gestes);
  };
  const thenReferentialRefreshedOnce = (): void => {
    expect(server.referentielCalls).toBe(1);
    expect(exposed?.referentiel).toEqual(referenceFixture);
  };
  const thenReferentialRefreshedTwice = (): void => {
    expect(server.referentielCalls).toBe(2);
  };
  const thenReferentialNeverRefreshed = (): void => {
    expect(server.referentielCalls).toBe(0);
  };
  const thenCompanyReferentialWasNotOverwritten = async (entreprise: string): Promise<void> => {
    const saved = await journal.read(Entreprise.of(entreprise));
    expect(saved.referentiel).toEqual(EMPTY_JOURNAL_DU_PUPITRE.referentiel);
  };
  const thenReferentialFailureWasLogged = (): void => {
    expect(errorHandler.errors).toEqual([expect.any(Error)]);
  };
  const thenAnErrorWasReported = (): void => {
    expect(errorHandler.errors).toContainEqual(new Error('publisher failed'));
  };
  const thenEventAcceptedWithoutOpeningDay = (): void => {
    expect(exposed?.evenements).toEqual([{ geste: gesteFixture, etat: 'ACCEPTE', journeeOuverte: false }]);
  };
  const thenEventAcceptedWithOpeningDay = (): void => {
    expect(exposed?.evenements).toEqual([{ geste: gesteFixture, etat: 'ACCEPTE', journeeOuverte: true }]);
  };
  const thenEventRefused = (code: string, message: string): void => {
    expect(exposed?.evenements).toEqual([{ geste: gesteFixture, etat: 'REFUSE', refus: { code, message } }]);
  };
  const thenDisconnectedStatusObserved = (): void => {
    expect(exposed?.connecte).toBe(false);
  };
  const thenDrainingStoppedWithoutDisconnection = (): void => {
    expect(exposed?.connecte).toBe(true);
  };
});
