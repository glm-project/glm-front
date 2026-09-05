import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { PupitreHorsLigne } from '@/pupitre/contexts/atelier/application/PupitreHorsLigne';
import { SynchronisationDuPupitre } from '@/pupitre/contexts/atelier/application/SynchronisationDuPupitre';
import { JournalDuPupitrePort } from '@/pupitre/contexts/atelier/domain/JournalDuPupitrePort';
import {
  ExpirationDesignation,
  PlanificationExpirationDesignationPort,
} from '@/pupitre/contexts/atelier/domain/PlanificationExpirationDesignationPort';
import { OperateurDuPupitre, PUPITRE_VIDE, PupitreLocal } from '@/pupitre/contexts/atelier/domain/PupitreLocal';
import { ServeurDuPupitrePort } from '@/pupitre/contexts/atelier/domain/ServeurDuPupitrePort';
import { TestBed } from '@angular/core/testing';
import { JournalDuPupitreFixture } from '@test/unit/fixtures/JournalDuPupitreFixture';
import { setTimeout as roundTrip } from 'node:timers';
import { DesignationRuntime } from './DesignationRuntime';

const operateurFixture: OperateurDuPupitre = { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] };

const referenceFixture: PupitreLocal = {
  ...PUPITRE_VIDE,
  referentiel: { operateurs: [operateurFixture], suivis: [] },
};

class JournalDesignationFixture extends JournalDuPupitreFixture {
  answer: Promise<PupitreLocal> | undefined;
  readStarted: Promise<void> = Promise.resolve();
  private notifyRead: () => void = () => undefined;

  delayRead(): void {
    this.readStarted = new Promise(resolve => {
      this.notifyRead = resolve;
    });
  }
  override read(): Promise<PupitreLocal> {
    this.notifyRead();
    const answer = this.answer;
    this.answer = undefined;
    if (answer !== undefined) return answer;
    return new Promise(resolve => roundTrip(() => resolve(structuredClone(referenceFixture))));
  }
}

class PlanificationExpirationFixture extends PlanificationExpirationDesignationPort {
  private timer: ReturnType<typeof setTimeout> | undefined;

  override schedule(deadline: number | undefined, expiration: ExpirationDesignation): void {
    clearTimeout(this.timer);
    if (deadline !== undefined) this.timer = setTimeout(() => expiration.expire(), deadline - Date.now());
  }
}

describe('Designation du pupitre', () => {
  let designation: PupitreHorsLigne;
  let journal: JournalDesignationFixture;
  beforeEach(async () => {
    journal = new JournalDesignationFixture();
    await journal.saveReferentiel('atelier', referenceFixture.referentiel!);
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        DesignationRuntime,
        PupitreHorsLigne,
        SynchronisationDuPupitre,
        { provide: JournalDuPupitrePort, useValue: journal },
        { provide: ServeurDuPupitrePort, useValue: {} },
        { provide: PlanificationExpirationDesignationPort, useClass: PlanificationExpirationFixture },
        {
          provide: AuthenticationPort,
          useValue: { currentTenant: () => 'atelier', synchronizeSession: () => new Promise<void>(resolve => roundTrip(resolve)) },
        },
      ],
    });
    designation = TestBed.inject(PupitreHorsLigne);
    TestBed.inject(DesignationRuntime);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('should preserve leading zeros and designate only on explicit validation', async () => {
    whenEntering('049');
    thenCodeIs('049');
    thenNoOperatorIsDesignated();
    await whenValidating();
    thenOperatorIsDesignated();
  });
  it('should ignore empty validation and non numeric input', async () => {
    whenEntering('a');
    await whenValidating();
    thenCodeIs('');
    thenNoOperatorIsDesignated();
  });
  it('should replace an unknown code with an error then start fresh with the next digit', async () => {
    whenEntering('7');
    await whenValidating();
    thenUnknownCodeIsShown();
    whenEntering('0');
    thenCodeIs('0');
  });
  it('should erase the error or the last digit and tolerate erasing an empty code', async () => {
    whenEntering('7');
    await whenValidating();
    whenErasing();
    thenCodeIs('');
    whenEntering('049');
    whenErasing();
    thenCodeIs('04');
    whenErasing();
    whenErasing();
    whenErasing();
    thenCodeIs('');
  });
  it('should reset a partial code after thirty seconds and renew on a blank screen press', async () => {
    whenEntering('04');
    await whenTimePasses(29_000);
    whenPressing();
    await whenTimePasses(29_000);
    thenCodeIs('04');
    await whenTimePasses(1_000);
    thenCodeIs('');
  });
  it('should clear an error after inactivity', async () => {
    whenEntering('7');
    await whenValidating();
    await whenTimePasses(30_000);
    thenCodeIs('');
  });
  it('should close the designation on completion and on inactivity', async () => {
    whenEntering('049');
    await whenValidating();
    await whenFinishing();
    thenClosed();
    whenEntering('049');
    await whenValidating();
    await whenTimePasses(30_000);
    thenClosed();
  });
  it('should consume the first press after sleeping beyond the deadline', () => {
    whenEntering('04');
    whenSleeping(31_000);
    const accepted = whenPressing();
    thenPressIsRejected(accepted);
    thenCodeIs('');
    whenEntering('9');
    thenCodeIs('9');
  });
  it('should freeze input and prevent duplicate validation while resolving and while designated', async () => {
    whenEntering('049');
    const pending = whenValidating();
    whenEntering('1');
    whenErasing();
    await whenValidating();
    await whenResolutionCompletes(pending);
    whenEntering('2');
    whenErasing();
    await whenValidating();
    thenOperatorIsDesignated();
  });
  it('should close a late resolution without reopening an expired designation', async () => {
    const resolve = givenDelayedResolution();
    whenEntering('049');
    const pending = whenValidating();
    await whenTimePasses(30_000);
    whenAnswering(resolve);
    await whenResolutionCompletes(pending);
    thenClosed();
  });
  it('should discard a late failure after completion', async () => {
    const reject = givenDelayedFailure();
    whenEntering('049');
    const pending = whenValidating();
    await whenReadStarts();
    await whenFinishing();
    whenRejecting(reject);
    await whenResolutionCompletes(pending);
    thenClosed();
  });
  it('should discard a failed local read after sleep before the expiry timer runs', async () => {
    const reject = givenDelayedFailure();
    whenEntering('049');
    const pending = whenValidating();
    await whenReadStarts();

    whenSleeping(31_000);
    whenRejecting(reject);
    await whenResolutionCompletes(pending);

    thenClosed();
  });

  it('should reject a resolution delivered after sleep even before the timer runs', async () => {
    const resolve = givenDelayedResolution();
    whenEntering('049');
    const pending = whenValidating();
    await whenReadStarts();
    whenSleeping(31_000);
    whenAnswering(resolve);
    await whenResolutionCompletes(pending);
    thenClosed();
  });
  it('should release a designation and timers when its owner is destroyed', async () => {
    whenEntering('049');
    await whenValidating();
    whenDestroying();
    await whenTimePasses(30_000);
    thenClosed();
  });

  it('should keep the first digit after expiry while the previous window is still closing', async () => {
    whenEntering('049');
    await whenValidating();
    const resolve = givenDelayedClosure();
    await whenTimePasses(30_000);
    await whenReadStarts();
    whenEntering('9');
    await whenValidating();
    thenCodeIs('9');
    thenNoOperatorIsDesignated();
    thenValidationIsUnavailable();
    whenClosingCompletes(resolve);
    await whenCheckingExpiration();
    thenCodeIs('9');
    whenErasing();
    whenEntering('049');
    await whenValidating();
    thenOperatorIsDesignated();
  });

  it('should refuse a new gesture after sleeping past the designation deadline without a timer callback', async () => {
    whenEntering('049');
    await whenValidating();

    whenSleeping(31_000);

    thenNewGestureIsRefused();
  });

  const thenNewGestureIsRefused = (): void => {
    expect(() => designation.recordPresence('PAUSE')).toThrow('Aucune fenetre operateur ouverte.');
  };

  const givenDelayedClosure = (): (() => void) => {
    const resolve = givenDelayedResolution();
    return () => resolve(referenceFixture);
  };
  const whenCheckingExpiration = (): Promise<void> => designation.expire();
  const whenClosingCompletes = (resolve: () => void): void => resolve();
  const whenReadStarts = async (): Promise<void> => {
    await journal.readStarted;
  };

  const whenEntering = (code: string): void => {
    for (const digit of code) designation.enterDigit(digit);
    TestBed.tick();
  };
  const whenValidating = async (): Promise<void> => {
    const pending = designation.validate();
    TestBed.tick();
    return pending;
  };
  const whenErasing = (): void => designation.erase();
  const whenPressing = (): boolean => {
    const accepted = designation.registerPress();
    TestBed.tick();
    return accepted;
  };
  const whenFinishing = async (): Promise<void> => {
    const pending = designation.finish();
    return pending;
  };
  const whenTimePasses = async (duration: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(duration);
  };
  const whenSleeping = (duration: number): void => {
    vi.setSystemTime(Date.now() + duration);
  };
  const whenResolutionCompletes = async (pending: Promise<void>): Promise<void> => pending;
  const whenDestroying = (): void => TestBed.inject(DesignationRuntime).ngOnDestroy();
  const givenDelayedResolution = (): ((state: PupitreLocal) => void) => {
    journal.delayRead();
    let resolve!: (state: PupitreLocal) => void;
    journal.answer = new Promise(answer => {
      resolve = answer;
    });
    return resolve;
  };
  const givenDelayedFailure = (): ((reason: Error) => void) => {
    journal.delayRead();
    let reject!: (reason: Error) => void;
    journal.answer = new Promise((_resolve, failure) => {
      reject = failure;
    });
    return reject;
  };
  const whenAnswering = (resolve: (state: PupitreLocal) => void): void => resolve(referenceFixture);
  const whenRejecting = (reject: (reason: Error) => void): void => reject(new Error('Unavailable'));
  const thenCodeIs = (code: string): void => {
    expect(designation.code()).toBe(code);
    expect(designation.unknownCode()).toBe(false);
  };
  const thenNoOperatorIsDesignated = (): void => {
    expect(designation.operateur()).toBeUndefined();
  };
  const thenOperatorIsDesignated = (): void => {
    expect(designation.operateur()).toEqual(operateurFixture);
    expect(designation.unknownCode()).toBe(false);
  };
  const thenUnknownCodeIsShown = (): void => {
    expect(designation.code()).toBe('');
    expect(designation.unknownCode()).toBe(true);
  };
  const thenClosed = (): void => {
    thenCodeIs('');
    thenNoOperatorIsDesignated();
    expect(() => TestBed.inject(PupitreHorsLigne).recordPresence('PAUSE')).toThrow('Aucune fenetre operateur ouverte.');
  };
  const thenValidationIsUnavailable = (): void => {
    expect(designation.canValidate()).toBe(false);
  };
  const thenPressIsRejected = (accepted: boolean): void => {
    expect(accepted).toBe(false);
  };
});
