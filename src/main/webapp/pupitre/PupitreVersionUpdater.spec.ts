import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { CurrentOperateurLifecycle } from '@/pupitre/contexts/atelier/application/CurrentOperateurLifecycle';
import { GestesRecordingQueue } from '@/pupitre/contexts/atelier/application/GestesRecordingQueue';
import { ApplicationRef, DOCUMENT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { BehaviorSubject, Subject } from 'rxjs';
import { PupitreVersionUpdater } from './PupitreVersionUpdater';

class ServiceWorkerFixture {
  isEnabled = true;
  readonly versionUpdates = new Subject<VersionEvent>();
  checks = 0;

  checkForUpdate(): Promise<boolean> {
    this.checks += 1;
    return new Promise(resolve =>
      setTimeout(() => {
        resolve(false);
      }),
    );
  }

  releaseVersion(): void {
    this.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
  }

  detectVersion(): void {
    this.versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });
  }
}

class RecordingQueueFixture {
  private pending: Promise<void> = Promise.resolve();
  private complete: (() => void) | undefined;

  drain(): Promise<void> {
    return this.pending;
  }

  holdCapture(): void {
    this.pending = new Promise(resolve => {
      this.complete = resolve;
    });
  }

  completeCapture(): void {
    this.complete?.();
  }
}

class DocumentFixture extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible';
  readonly location = { reload: vi.fn() };

  hide(): void {
    this.visibilityState = 'hidden';
    this.dispatchEvent(new Event('visibilitychange'));
  }

  returnToPupitre(): void {
    this.visibilityState = 'visible';
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

describe('PupitreVersionUpdater', () => {
  let updater: PupitreVersionUpdater;
  let worker: ServiceWorkerFixture;
  let reload: ReturnType<typeof vi.fn>;
  let operateur: ReturnType<typeof signal<string | undefined>>;
  let code: ReturnType<typeof signal<string>>;
  let recordings: RecordingQueueFixture;
  let stable: BehaviorSubject<boolean>;
  let documentFixture: DocumentFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    worker = new ServiceWorkerFixture();
    documentFixture = new DocumentFixture();
    reload = documentFixture.location.reload;
    operateur = signal<string | undefined>(undefined);
    code = signal('');
    recordings = new RecordingQueueFixture();
    stable = new BehaviorSubject(false);
    TestBed.configureTestingModule({
      providers: [
        PupitreVersionUpdater,
        { provide: SwUpdate, useValue: worker },
        { provide: DOCUMENT, useValue: documentFixture },
        { provide: CurrentOperateurLifecycle, useValue: { code, operateur } },
        { provide: GestesRecordingQueue, useValue: recordings },
        { provide: ErrorHandlerPort, useValue: new ErrorHandlerFixture() },
      ],
    });
    vi.spyOn(TestBed.inject(ApplicationRef), 'isStable', 'get').mockReturnValue(stable);
    updater = TestBed.inject(PupitreVersionUpdater);
  });

  afterEach(() => {
    stable.complete();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should reload an idle pupitre when a complete new version is ready', async () => {
    whenStartingThePupitre();
    whenTheNewVersionIsDetected();
    const reloadsWhileDownloading = reload.mock.calls.length;
    whenTheNewVersionIsReady();
    await Promise.resolve();

    expect(reloadsWhileDownloading).toBe(0);
    thenThePupitreReloads();
  });

  it('should wait for the operator window to end before reloading a ready version', async () => {
    givenAnActiveOperator();
    whenStartingThePupitre();
    whenTheNewVersionIsReady();
    const reloadsDuringDesignation = reload.mock.calls.length;
    await whenTheOperatorFinishes();

    expect(reloadsDuringDesignation).toBe(0);
    thenThePupitreReloads();
  });

  it('should preserve an identifiant being entered until the entry ends', async () => {
    givenAIdentifiantBeingEntered();
    whenStartingThePupitre();
    whenTheNewVersionIsReady();
    const reloadsDuringEntry = reload.mock.calls.length;
    await whenTheIdentifiantEntryEnds();

    expect(reloadsDuringEntry).toBe(0);
    thenThePupitreReloads();
  });

  it('should wait for a gesture to be stored before reloading a ready version', async () => {
    givenAPendingLocalCapture();
    whenStartingThePupitre();
    whenTheNewVersionIsReady();
    await whenOneSecondPasses();
    const reloadsBeforeAcceptance = reload.mock.calls.length;
    await whenTheCaptureCompletes();

    expect(reloadsBeforeAcceptance).toBe(0);
    thenThePupitreReloads();
  });

  it('should keep a new operator window open if it starts while a capture is still being stored', async () => {
    givenAPendingLocalCapture();
    whenStartingThePupitre();
    whenTheNewVersionIsReady();
    whenAnOperatorStartsDuringCapture();
    await whenTheCaptureCompletes();
    const reloadsWithTheNewOperator = reload.mock.calls.length;
    await whenTheOperatorFinishes();

    expect(reloadsWithTheNewOperator).toBe(0);
    thenThePupitreReloads();
  });

  it('should preserve a new identifiant entry if it starts while a capture is still being stored', async () => {
    givenAPendingLocalCapture();
    whenStartingThePupitre();
    whenTheNewVersionIsReady();
    whenAIdentifiantStartsDuringCapture();
    await whenTheCaptureCompletes();
    const reloadsDuringTheNewEntry = reload.mock.calls.length;
    await whenTheIdentifiantEntryEnds();

    expect(reloadsDuringTheNewEntry).toBe(0);
    thenThePupitreReloads();
  });

  const whenAIdentifiantStartsDuringCapture = (): void => {
    code.set('049');
  };

  const whenAnOperatorStartsDuringCapture = (): void => {
    operateur.set('operator-1');
  };

  it('should leave the development pupitre alone when the service worker is disabled', async () => {
    givenTheServiceWorkerIsDisabled();
    whenStartingThePupitre();
    whenTheNewVersionIsReady();
    await Promise.resolve();

    thenThePupitreHasNotReloaded();
  });

  it('should check for a deployed version after five minutes without navigating away', async () => {
    whenStartingThePupitre();
    await whenFiveMinutesPass();
    const checksBeforeStabilization = worker.checks;
    whenTheApplicationStabilizes();
    await whenFiveMinutesPass();

    expect(checksBeforeStabilization).toBe(0);
    expect(worker.checks).toBe(1);
  });

  it('should start checking after a fallback delay when the application never stabilizes', async () => {
    whenStartingThePupitre();
    await whenTheStartupFallbackPasses();
    await whenFiveMinutesPass();

    expect(worker.checks).toBe(1);
  });

  it('should check for a new version when the PWA returns to the foreground', () => {
    givenThePwaIsInTheBackground();
    whenStartingThePupitre();
    whenTheApplicationStabilizes();
    whenReturningToThePupitre();

    expect(worker.checks).toBe(1);
  });

  it('should check for a new version when the network returns', () => {
    whenStartingThePupitre();
    whenTheApplicationStabilizes();
    whenNetworkReturns();

    expect(worker.checks).toBe(1);
  });

  it('should stop checking after the pupitre updater is destroyed', async () => {
    whenStartingThePupitre();
    whenTheApplicationStabilizes();
    whenDestroyingTheUpdater();
    whenNetworkReturns();
    await whenFiveMinutesPass();

    expect(worker.checks).toBe(0);
  });

  it('should wait for connectivity before checking for a server version', async () => {
    givenThePupitreIsOffline();
    whenStartingThePupitre();
    whenTheApplicationStabilizes();
    await whenFiveMinutesPass();

    expect(worker.checks).toBe(0);
  });

  it('should wait until the PWA is visible before spending network traffic on an update', async () => {
    whenStartingThePupitre();
    whenTheApplicationStabilizes();
    whenThePwaGoesIntoTheBackground();
    await whenFiveMinutesPass();

    expect(worker.checks).toBe(0);
  });

  const whenThePwaGoesIntoTheBackground = (): void => {
    documentFixture.hide();
  };

  const givenThePupitreIsOffline = (): void => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  };

  const whenDestroyingTheUpdater = (): void => {
    updater.ngOnDestroy();
  };

  const whenNetworkReturns = (): void => {
    window.dispatchEvent(new Event('online'));
  };

  const givenThePwaIsInTheBackground = (): void => {
    documentFixture.hide();
  };
  const whenReturningToThePupitre = (): void => {
    documentFixture.returnToPupitre();
  };

  const whenTheApplicationStabilizes = (): void => {
    stable.next(true);
  };
  const whenTheStartupFallbackPasses = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(30_000);
  };
  const whenFiveMinutesPass = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(5 * 60_000);
  };
  const whenOneSecondPasses = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(1_000);
  };

  const givenTheServiceWorkerIsDisabled = (): void => {
    worker.isEnabled = false;
  };

  const givenAPendingLocalCapture = (): void => {
    recordings.holdCapture();
  };
  const whenTheCaptureCompletes = async (): Promise<void> => {
    recordings.completeCapture();
    await Promise.resolve();
  };

  const givenAIdentifiantBeingEntered = (): void => {
    code.set('049');
  };
  const whenTheIdentifiantEntryEnds = async (): Promise<void> => {
    code.set('');
    await vi.advanceTimersByTimeAsync(1_000);
  };

  const givenAnActiveOperator = (): void => {
    operateur.set('operator-1');
  };
  const whenTheOperatorFinishes = async (): Promise<void> => {
    operateur.set(undefined);
    await vi.advanceTimersByTimeAsync(1_000);
  };

  const whenStartingThePupitre = (): void => {
    updater.start();
  };
  const whenTheNewVersionIsReady = (): void => {
    worker.releaseVersion();
  };
  const whenTheNewVersionIsDetected = (): void => {
    worker.detectVersion();
  };
  const thenThePupitreReloads = (): void => {
    expect(reload).toHaveBeenCalledOnce();
  };
  const thenThePupitreHasNotReloaded = (): void => {
    expect(reload).not.toHaveBeenCalled();
  };
});
