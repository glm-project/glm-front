import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { PupitreRuntime } from './PupitreRuntime';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

class EnrolementFixture {
  private enrolment: Promise<void> | undefined;
  private completeEnrolment: (() => void) | undefined;

  enroler(): Promise<void> {
    return this.enrolment ?? roundTrip();
  }

  waitForApproval(): void {
    this.enrolment = new Promise(resolve => {
      this.completeEnrolment = resolve;
    });
  }

  approve(): void {
    this.completeEnrolment?.();
  }
}

class AtelierCoordinatorFixture {
  readonly connected = signal(true).asReadonly();
  synchronizationAttempts = 0;
  unavailable = false;
  private readonly completions: Promise<void>[] = [];

  synchronize(): Promise<void> {
    this.synchronizationAttempts += 1;
    const unavailable = this.unavailable;
    const completion = roundTrip().then(() => {
      if (unavailable) {
        throw new Error('synchronisation indisponible');
      }
    });
    this.completions.push(completion);
    return completion;
  }

  async settle(): Promise<void> {
    await Promise.allSettled(this.completions);
  }
}

describe('PupitreRuntime', () => {
  let runtime: PupitreRuntime;
  let enrolement: EnrolementFixture;
  let pupitre: AtelierCoordinatorFixture;
  let errorHandler: ErrorHandlerFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    errorHandler = new ErrorHandlerFixture();
    enrolement = new EnrolementFixture();
    pupitre = new AtelierCoordinatorFixture();
    TestBed.configureTestingModule({
      providers: [
        PupitreRuntime,
        { provide: EnrolementDuPupitre, useValue: enrolement },
        { provide: AtelierCoordinator, useValue: pupitre },
        { provide: EtatHorsLigneDuPupitre, useValue: pupitre },
        { provide: ErrorHandlerPort, useValue: errorHandler },
      ],
    });
    runtime = TestBed.inject(PupitreRuntime);
  });

  afterEach(() => {
    runtime.ngOnDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should leave the first workshop load to the enrolment, then refresh on reconnection and every minute', async () => {
    await whenStartingPupitre();

    await thenSynchronizationAttemptsAre(0);

    whenNetworkReturns();

    await thenSynchronizationAttemptsAre(1);

    await whenOneMinutePasses();

    await thenSynchronizationAttemptsAre(2);
  });

  it('should start only one refresh schedule', async () => {
    await whenStartingPupitreTwice();

    await whenOneMinutePasses();

    await thenSynchronizationAttemptsAre(1);
  });

  it('should stop refreshing after the runtime is destroyed', async () => {
    await whenStartingPupitre();

    whenDestroyingTheRuntime();
    whenNetworkReturns();
    await whenOneMinutePasses();

    await thenSynchronizationAttemptsAre(0);
  });

  it('should stop refreshing when destroyed while the pupitre is still enrolling', async () => {
    givenAnEnrolmentAwaitingApproval();

    const startup = whenStartingPupitre();
    whenDestroyingTheRuntime();
    await whenTheEnrolmentCompletes(startup);

    whenNetworkReturns();
    await whenOneMinutePasses();

    await thenSynchronizationAttemptsAre(0);
  });

  it('should already listen for the network while the pupitre is still enrolling', async () => {
    givenAnEnrolmentAwaitingApproval();

    const startup = whenStartingPupitre();
    whenNetworkReturns();

    await thenSynchronizationAttemptsAre(1);

    await whenTheEnrolmentCompletes(startup);
  });

  it('should refresh again after a background failure', async () => {
    givenUnavailableSynchronization();

    await whenStartingPupitre();
    whenNetworkReturns();
    await thenSynchronizationAttemptsAre(1);
    thenTheSynchronizationFailureWasLogged();

    whenSynchronizationRecovers();
    whenNetworkReturns();

    await thenSynchronizationAttemptsAre(2);
  });

  const givenAnEnrolmentAwaitingApproval = (): void => {
    enrolement.waitForApproval();
  };
  const givenUnavailableSynchronization = (): void => {
    pupitre.unavailable = true;
  };
  const whenStartingPupitre = (): Promise<void> => runtime.start();
  const whenStartingPupitreTwice = async (): Promise<void> => {
    await Promise.all([runtime.start(), runtime.start()]);
  };
  const whenDestroyingTheRuntime = (): void => {
    runtime.ngOnDestroy();
  };
  const whenTheEnrolmentCompletes = async (startup: Promise<void>): Promise<void> => {
    enrolement.approve();
    await startup;
  };
  const whenSynchronizationRecovers = (): void => {
    pupitre.unavailable = false;
  };
  const whenNetworkReturns = (): void => {
    window.dispatchEvent(new Event('online'));
  };
  const whenOneMinutePasses = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(60_000);
  };
  const thenSynchronizationAttemptsAre = async (expected: number): Promise<void> => {
    await pupitre.settle();
    expect(pupitre.synchronizationAttempts).toBe(expected);
  };
  const thenTheSynchronizationFailureWasLogged = (): void => {
    expect(errorHandler.errors).toEqual([new Error('synchronisation indisponible')]);
  };
});
