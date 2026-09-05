import { PupitreHorsLigne } from '@/app/atelier/application/PupitreHorsLigne';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PupitreRuntime } from './PupitreRuntime';

describe('PupitreRuntime', () => {
  let runtime: PupitreRuntime;
  let synchronizations: number;
  let failed: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    synchronizations = 0;
    failed = false;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        PupitreRuntime,
        {
          provide: PupitreHorsLigne,
          useValue: {
            connected: signal(true),
            synchronize: (): Promise<void> => {
              synchronizations++;
              if (failed) {
                return Promise.reject(new Error('stockage'));
              }
              return Promise.resolve();
            },
          },
        },
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
    runtime.start();

    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);

    thenSynchronizationCountIs(3);
  });

  it('should stop the clock and network listener when the shell is destroyed', async () => {
    runtime.start();
    runtime.ngOnDestroy();

    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);

    thenSynchronizationCountIs(1);
  });

  it('should contain a background storage failure and retry on the next trigger', async () => {
    failed = true;
    runtime.start();

    await vi.advanceTimersByTimeAsync(60_000);

    thenSynchronizationCountIs(2);
  });

  const thenSynchronizationCountIs = (count: number): void => {
    expect(synchronizations).toBe(count);
  };
});
