import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PupitreRuntime } from './PupitreRuntime';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

class AuthenticationFixture extends AuthenticationPort {
  private authentication: Promise<void> | undefined;
  private completeAuthentication: (() => void) | undefined;

  override authenticate(): Promise<void> {
    return this.authentication ?? roundTrip();
  }
  override currentToken(): string {
    return 'autorise';
  }
  override logout(): void {
    throw new Error('La session fixture reste ouverte.');
  }

  waitForPermission(): void {
    this.authentication = new Promise(resolve => {
      this.completeAuthentication = resolve;
    });
  }

  permit(): void {
    this.completeAuthentication?.();
  }
}

class OfflinePupitreFixture {
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
  let authentication: AuthenticationFixture;
  let pupitre: OfflinePupitreFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    authentication = new AuthenticationFixture();
    pupitre = new OfflinePupitreFixture();
    TestBed.configureTestingModule({
      providers: [
        PupitreRuntime,
        { provide: AuthenticationPort, useValue: authentication },
        { provide: OfflinePupitre, useValue: pupitre },
      ],
    });
    runtime = TestBed.inject(PupitreRuntime);
  });

  afterEach(() => {
    runtime.ngOnDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should synchronize at startup, reconnection and every minute', async () => {
    await whenStartingPupitre();

    await thenSynchronizationAttemptsAre(1);

    whenNetworkReturns();

    await thenSynchronizationAttemptsAre(2);

    await whenOneMinutePasses();

    await thenSynchronizationAttemptsAre(3);
  });

  it('should start only one synchronization schedule', async () => {
    await whenStartingPupitreTwice();

    await whenOneMinutePasses();

    await thenSynchronizationAttemptsAre(2);
  });

  it('should stop synchronization after the runtime is destroyed', async () => {
    await whenStartingPupitre();

    whenDestroyingTheRuntime();
    whenNetworkReturns();
    await whenOneMinutePasses();

    await thenSynchronizationAttemptsAre(1);
  });

  it('should not start synchronization when destroyed during authentication restoration', async () => {
    givenAuthenticationInProgress();

    const startup = whenStartingPupitre();
    whenDestroyingTheRuntime();
    await whenAuthenticationCompletes(startup);

    whenNetworkReturns();
    await whenOneMinutePasses();

    await thenSynchronizationAttemptsAre(0);
  });

  it('should attempt synchronization again after a background failure', async () => {
    givenUnavailableSynchronization();

    await whenStartingPupitre();
    whenSynchronizationRecovers();
    whenNetworkReturns();

    await thenSynchronizationAttemptsAre(2);
  });

  const givenAuthenticationInProgress = (): void => authentication.waitForPermission();
  const givenUnavailableSynchronization = (): void => {
    pupitre.unavailable = true;
  };
  const whenStartingPupitre = (): Promise<void> => runtime.start();
  const whenStartingPupitreTwice = async (): Promise<void> => {
    await Promise.all([runtime.start(), runtime.start()]);
  };
  const whenDestroyingTheRuntime = (): void => runtime.ngOnDestroy();
  const whenAuthenticationCompletes = async (startup: Promise<void>): Promise<void> => {
    authentication.permit();
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
});
