import {
  DesignationExpiration,
  DesignationExpirationSchedulerPort,
} from '@/pupitre/contexts/atelier/domain/DesignationExpirationSchedulerPort';
import { TestBed } from '@angular/core/testing';
import { TimerDesignationExpirationScheduler } from './TimerDesignationExpirationScheduler';

const adapters: [string, () => DesignationExpirationSchedulerPort][] = [
  ['browser timer', () => TestBed.inject(TimerDesignationExpirationScheduler)],
];

describe.each(adapters)('DesignationExpirationSchedulerPort contract, honoured by %s', (_adapter, buildPlanification) => {
  let planification: DesignationExpirationSchedulerPort;
  let expirations: number;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    TestBed.configureTestingModule({ providers: [TimerDesignationExpirationScheduler] });
    planification = buildPlanification();
    expirations = 0;
  });

  afterEach(() => vi.useRealTimers());

  it('should replace the previous deadline and cancel it when no deadline remains', () => {
    givenExpirationAt(2_000);

    whenReplacingExpirationAt(3_000);
    whenTimePasses(1_000);

    thenNothingExpired();

    whenCancellingExpiration();
    whenTimePasses(1_000);

    thenNothingExpired();

    givenExpirationAt(4_000);
    whenTimePasses(1_000);

    thenExpirationWasRequested();
  });

  const expirationFixture = (): DesignationExpiration => ({ expire: () => expirations++ });
  const givenExpirationAt = (deadline: number): void => {
    planification.schedule(deadline, expirationFixture());
  };
  const whenReplacingExpirationAt = (deadline: number): void => {
    planification.schedule(deadline, expirationFixture());
  };
  const whenCancellingExpiration = (): void => {
    planification.schedule(undefined, expirationFixture());
  };
  const whenTimePasses = (duration: number): void => {
    vi.advanceTimersByTime(duration);
  };
  const thenNothingExpired = (): void => {
    expect(expirations).toBe(0);
  };
  const thenExpirationWasRequested = (): void => {
    expect(expirations).toBe(1);
  };
});
