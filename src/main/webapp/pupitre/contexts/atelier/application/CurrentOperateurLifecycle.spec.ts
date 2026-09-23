import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { CurrentOperateurLifecycle } from '@/pupitre/contexts/atelier/application/CurrentOperateurLifecycle';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import {
  DesignationExpiration,
  DesignationExpirationSchedulerPort,
} from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  JournalDuPupitre,
  OperateurDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AtelierExchangeFixture } from '@test/unit/fixtures/pupitre/atelier/AtelierExchangeFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { DeviceSessionFixture } from '@test/unit/fixtures/pupitre/DeviceSessionFixture';
import { setTimeout as roundTrip } from 'node:timers';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';
import { FraicheurDuReferentiel } from './FraicheurDuReferentiel';
import { GestesRecordingQueue } from './GestesRecordingQueue';

const operateurFixture: OperateurDuPupitre = {
  id: 'jean',
  nom: 'Dupont',
  prenom: 'Jean',
  matricule: '049',
  etat: 'ABSENT',
  postes: [],
  evenements: [],
};
const identiteOperateurFixture = { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049' };

const operateurAjouteFixture: OperateurDuPupitre = {
  id: 'lea',
  nom: 'Martin',
  prenom: 'Lea',
  matricule: '050',
  etat: 'ABSENT',
  postes: [],
  evenements: [],
};
const identiteOperateurAjouteFixture = { id: 'lea', nom: 'Martin', prenom: 'Lea', matricule: '050' };

const referentielFixture = { operateurs: [operateurFixture], suivis: [] };

const referenceFixture: JournalDuPupitre = {
  ...EMPTY_JOURNAL_DU_PUPITRE,
  referentiel: referentielFixture,
};

class DesignationJournalFixture extends JournauxDuPupitreFixture {
  answer: Promise<JournalDuPupitre> | undefined;
  readStarted: Promise<void> = Promise.resolve();
  private notifyRead: () => void = () => undefined;

  delayRead(): void {
    this.readStarted = new Promise(resolve => {
      this.notifyRead = resolve;
    });
  }
  override read(entreprise: Entreprise): Promise<JournalDuPupitre> {
    this.notifyRead();
    const answer = this.answer;
    this.answer = undefined;
    if (answer !== undefined) return answer;
    return super.read(entreprise);
  }
}

class DesignationExpirationSchedulerFixture extends DesignationExpirationSchedulerPort {
  private timer: ReturnType<typeof setTimeout> | undefined;

  override schedule(deadline: number | undefined, expiration: DesignationExpiration): void {
    clearTimeout(this.timer);
    if (deadline !== undefined)
      this.timer = setTimeout(() => {
        expiration.expire();
      }, deadline - Date.now());
  }
}

describe('Designation du pupitre', () => {
  let designation: CurrentOperateurLifecycle;
  let journal: DesignationJournalFixture;
  let errorHandler: ErrorHandlerFixture;
  let serveur: AtelierExchangeFixture;
  let sessionFailure: Error | undefined;
  beforeEach(async () => {
    sessionFailure = undefined;
    errorHandler = new ErrorHandlerFixture();
    journal = new DesignationJournalFixture();
    serveur = new AtelierExchangeFixture();
    serveur.reference = referentielFixture;
    await journal.saveReferentiel(Entreprise.of('atelier'), referentielFixture);
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        GestesRecordingQueue,
        EtatHorsLigneDuPupitre,
        FraicheurDuReferentiel,
        AtelierCoordinator,
        CurrentOperateurLifecycle,
        PupitreSynchronization,
        { provide: JournauxDuPupitrePort, useValue: journal },
        { provide: AtelierExchangePort, useValue: serveur },
        { provide: DesignationExpirationSchedulerPort, useClass: DesignationExpirationSchedulerFixture },
        { provide: DeviceSessionPort, useClass: DeviceSessionFixture },
        {
          provide: AuthenticationPort,
          useValue: {
            currentTenant: () => 'atelier',
            currentToken: () => 'jeton',
            synchronizeSession: () =>
              new Promise<void>((resolve, reject) =>
                roundTrip(() => {
                  if (sessionFailure === undefined) resolve();
                  else reject(sessionFailure);
                }),
              ),
          },
        },
        { provide: ErrorHandlerPort, useValue: errorHandler },
      ],
    });
    designation = TestBed.inject(CurrentOperateurLifecycle);
  });
  afterEach(async () => {
    serveur.settle();
    await journal.synchronizationsSettled();
    await new Promise(resolve => roundTrip(resolve));
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('should preserve leading zeros before validation', () => {
    whenEntering('049');

    thenCodeIs('049');
    thenNoOperatorIsDesignated();
  });

  it('should designate the operator on explicit validation', async () => {
    whenEntering('049');
    await whenValidating();

    thenOperatorIsDesignated();
  });
  it('should ignore empty validation and non numeric input', async () => {
    whenEntering('a');
    await whenValidating();
    thenCodeIs('');
    thenNoOperatorIsDesignated();
  });
  it('should display an unknown code error', async () => {
    whenEntering('7');
    await whenValidating();

    thenUnknownCodeIsShown();
  });

  it('should start fresh with the next digit after an unknown code', async () => {
    whenEntering('7');
    await whenValidating();
    whenEntering('0');

    thenCodeIs('0');
  });
  it('should erase an unknown code error', async () => {
    whenEntering('7');
    await whenValidating();
    whenErasing();

    thenCodeIs('');
  });

  it('should erase only the last digit', async () => {
    whenEntering('7');
    await whenValidating();
    whenErasing();
    whenEntering('049');
    whenErasing();

    thenCodeIs('04');
  });

  it('should tolerate erasing an empty code', async () => {
    whenEntering('7');
    await whenValidating();
    whenErasing();
    whenEntering('049');
    whenErasing();
    whenErasing();
    whenErasing();
    whenErasing();

    thenCodeIs('');
  });
  it('should renew a partial code deadline on a blank screen press', async () => {
    whenEntering('04');
    await whenTimePasses(29_000);
    whenPressing();
    await whenTimePasses(29_000);

    thenCodeIs('04');
  });

  it('should clear a partial code at its renewed deadline', async () => {
    whenEntering('04');
    await whenTimePasses(29_000);
    whenPressing();
    await whenTimePasses(29_000);
    await whenTimePasses(1_000);

    thenCodeIs('');
  });
  it('should clear an error after inactivity', async () => {
    whenEntering('7');
    await whenValidating();
    await whenTimePasses(30_000);
    thenCodeIs('');
  });
  it('should close the designation on completion', async () => {
    whenEntering('049');
    await whenValidating();
    await whenFinishing();

    thenClosed();
  });

  it('should close the designation on inactivity', async () => {
    whenEntering('049');
    await whenValidating();
    await whenFinishing();
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
  });

  it('should accept a digit after consuming an expired press', () => {
    whenEntering('04');
    whenSleeping(31_000);
    whenPressing();
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
  it('should retain the code and report a local read failure', async () => {
    const reject = givenDelayedFailure();
    whenEntering('049');
    const pending = whenValidating();
    await whenReadStarts();
    whenRejecting(reject);
    await whenResolutionCompletes(pending);

    thenCodeIs('049');
    thenNoOperatorIsDesignated();
    thenValidationIsAvailable();
    thenTheLocalReadFailureWasReported();
    thenNoExchangeWasAttempted();
  });

  it('should designate the operator after retrying a failed local read', async () => {
    const reject = givenDelayedFailure();
    whenEntering('049');
    const pending = whenValidating();
    await whenReadStarts();
    whenRejecting(reject);
    await whenResolutionCompletes(pending);
    await whenValidating();

    thenOperatorIsDesignated();
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
  it('should report a failed closure launched by the expiration timer', async () => {
    whenEntering('049');
    await whenValidating();
    const reject = givenDelayedFailure();
    const reported = whenAFailureIsReported();

    await whenTimePasses(30_001);
    await whenReadStarts();
    whenRejecting(reject);
    await reported;

    expect(errorHandler.errors).toEqual([expect.objectContaining({ message: 'Unavailable' })]);
  });
  it('should keep the first digit after expiry while the previous window is still closing', async () => {
    whenEntering('049');
    await whenValidating();
    const resolve = givenDelayedClosure();
    await whenTimePasses(30_000);
    await whenReadStarts();
    whenEntering('9');
    await whenValidating();
    const duringClosure = readDesignation();
    whenClosingCompletes(resolve);
    await whenCheckingExpiration();
    const afterClosure = readDesignation();
    whenErasing();
    whenEntering('049');
    await whenValidating();
    expect(duringClosure).toEqual({ code: '9', unknown: false, operateur: undefined, canValidate: false });
    expect(afterClosure.code).toBe('9');
    expect(afterClosure.unknown).toBe(false);
    thenOperatorIsDesignated();
  });

  it('should refuse a new gesture after sleeping past the designation deadline without a timer callback', async () => {
    whenEntering('049');
    await whenValidating();

    whenSleeping(31_000);

    thenNewGestureIsRefused();
  });

  it('should designate without any exchange of its own', async () => {
    whenEntering('049');
    await whenValidating();
    await whenTheServerRefreshSettles();

    thenOperatorIsDesignated();
    thenNoExchangeWasAttempted();
  });

  it('should reach an operator added to the referential after a window closes', async () => {
    givenAnOperateurAddedToTheServerReferential();

    whenEntering('049');
    await whenValidating();
    await whenFinishing();
    await whenTheServerRefreshSettles();
    whenEntering('050');
    await whenValidating();

    thenTheAddedOperatorIsDesignated();
  });

  it('should reach an operator added to the referential even when the closure fails to reread the journal', async () => {
    givenAnOperateurAddedToTheServerReferential();
    whenEntering('049');
    await whenValidating();

    const reject = givenDelayedFailure();
    const closure = whenFinishing();
    await whenReadStarts();
    whenRejecting(reject);
    await whenTheClosureFails(closure);

    await whenTheServerRefreshSettles();
    whenEntering('050');
    await whenValidating();

    thenTheAddedOperatorIsDesignated();
  });

  it('should reach an operator added to the referential on the keystroke after their code came back unknown', async () => {
    givenAnOperateurAddedToTheServerReferential();

    whenEntering('050');
    await whenValidating();
    await whenTheServerRefreshSettles();
    whenEntering('050');
    await whenValidating();

    thenTheAddedOperatorIsDesignated();
  });

  it('should leave the referential untouched when the resolution fails for another reason than an unknown code', async () => {
    givenAnOperateurAddedToTheServerReferential();
    const reject = givenDelayedFailure();

    whenEntering('050');
    const pending = whenValidating();
    await whenReadStarts();
    whenRejecting(reject);
    await whenResolutionCompletes(pending);
    await whenTheServerRefreshSettles();
    await whenValidating();

    thenUnknownCodeIsShown();
  });

  it('should not push the referential twice for the same unknown code', async () => {
    whenEntering('050');
    await whenValidating();
    await whenTheServerRefreshSettles();
    const pushed = givenTheExchangesSoFar();

    whenEntering('050');
    await whenValidating();
    await whenTheServerRefreshSettles();

    thenNoFurtherExchangeWasAttempted(pushed);
  });

  it('should push the referential again for a different unknown code', async () => {
    whenEntering('050');
    await whenValidating();
    await whenTheServerRefreshSettles();
    const pushed = givenTheExchangesSoFar();

    whenEntering('051');
    await whenValidating();
    await whenTheServerRefreshSettles();

    thenAFurtherExchangeWasAttempted(pushed);
  });

  it('should push the referential again for a code refused before a successful designation', async () => {
    whenEntering('050');
    await whenValidating();
    await whenTheServerRefreshSettles();
    whenEntering('049');
    await whenValidating();
    await whenFinishing();
    await whenTheServerRefreshSettles();
    const pushed = givenTheExchangesSoFar();

    whenEntering('050');
    await whenValidating();
    await whenTheServerRefreshSettles();

    thenAFurtherExchangeWasAttempted(pushed);
  });

  it('should keep showing the unknown code while the pushed refresh runs', async () => {
    givenAnOperateurAddedToTheServerReferential();

    whenEntering('050');
    await whenValidating();
    await whenTheServerRefreshSettles();

    thenUnknownCodeIsShown();
  });

  it('should designate again while every exchange pushed by the previous closure still hangs', async () => {
    givenAHangingServerExchange();

    whenEntering('049');
    await whenValidating();
    await whenFinishing();
    whenEntering('049');
    await whenValidating();

    thenOperatorIsDesignated();
  });

  it('should close the designation even when the pushed refresh rejects', async () => {
    whenEntering('049');
    await whenValidating();
    whenTheSessionStopsAnswering();
    const reported = whenAFailureIsReported();

    await whenFinishing();
    await reported;

    thenClosed();
    thenTheRefreshFailureWasReported();
  });

  const givenAnOperateurAddedToTheServerReferential = (): void => {
    serveur.reference = { operateurs: [operateurFixture, operateurAjouteFixture], suivis: [] };
  };
  const givenAHangingServerExchange = (): void => {
    serveur.suspendExchanges();
  };
  const whenTheSessionStopsAnswering = (): void => {
    sessionFailure = new Error('Session indisponible');
  };
  const whenTheServerRefreshSettles = (): Promise<void> => journal.synchronizationsSettled();
  const whenTheClosureFails = async (closure: Promise<void>): Promise<void> => {
    await expect(closure).rejects.toThrow('Unavailable');
  };
  const whenAFailureIsReported = (): Promise<void> => errorHandler.nextFailure();
  const thenNoExchangeWasAttempted = (): void => {
    expect(serveur.attempts).toBe(0);
  };
  const givenTheExchangesSoFar = (): number => serveur.attempts;
  const thenNoFurtherExchangeWasAttempted = (previous: number): void => {
    expect(serveur.attempts).toBe(previous);
  };
  const thenAFurtherExchangeWasAttempted = (previous: number): void => {
    expect(serveur.attempts).toBeGreaterThan(previous);
  };
  const thenTheAddedOperatorIsDesignated = (): void => {
    expect(designation.operateur()).toEqual(identiteOperateurAjouteFixture);
  };
  const thenTheRefreshFailureWasReported = (): void => {
    expect(errorHandler.errors).toContainEqual(new Error('Session indisponible'));
  };

  const thenNewGestureIsRefused = (): void => {
    expect(() => TestBed.inject(AtelierCoordinator).executeGlobale('PAUSE')).toThrow('Aucune fenetre operateur ouverte.');
  };

  const givenDelayedClosure = (): (() => void) => {
    const resolve = givenDelayedResolution();
    return () => {
      resolve(referenceFixture);
    };
  };
  const whenCheckingExpiration = (): Promise<void> => designation.expire();
  const whenClosingCompletes = (resolve: () => void): void => {
    resolve();
  };
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
  const whenErasing = (): void => {
    designation.erase();
  };
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
  const givenDelayedResolution = (): ((state: JournalDuPupitre) => void) => {
    journal.delayRead();
    let resolve: ((state: JournalDuPupitre) => void) | undefined;
    journal.answer = new Promise(answer => {
      resolve = answer;
    });
    if (resolve === undefined) throw new Error('Delayed resolution is not initialized.');
    return resolve;
  };
  const givenDelayedFailure = (): ((reason: Error) => void) => {
    journal.delayRead();
    let reject: ((reason: Error) => void) | undefined;
    journal.answer = new Promise((_resolve, failure) => {
      reject = failure;
    });
    if (reject === undefined) throw new Error('Delayed failure is not initialized.');
    return reject;
  };
  const whenAnswering = (resolve: (state: JournalDuPupitre) => void): void => {
    resolve(referenceFixture);
  };
  const whenRejecting = (reject: (reason: Error) => void): void => {
    reject(new Error('Unavailable'));
  };
  const readDesignation = () => ({
    code: designation.code(),
    unknown: designation.unknownCode(),
    operateur: designation.operateur(),
    canValidate: designation.canValidate(),
  });
  const thenCodeIs = (code: string): void => {
    expect(designation.code()).toBe(code);
    expect(designation.unknownCode()).toBe(false);
  };
  const thenNoOperatorIsDesignated = (): void => {
    expect(designation.operateur()).toBeUndefined();
  };
  const thenOperatorIsDesignated = (): void => {
    expect(designation.operateur()).toEqual(identiteOperateurFixture);
    expect(designation.unknownCode()).toBe(false);
  };
  const thenUnknownCodeIsShown = (): void => {
    expect(designation.code()).toBe('');
    expect(designation.unknownCode()).toBe(true);
  };
  const thenClosed = (): void => {
    thenCodeIs('');
    thenNoOperatorIsDesignated();
    expect(() => TestBed.inject(AtelierCoordinator).executeGlobale('PAUSE')).toThrow('Aucune fenetre operateur ouverte.');
  };
  const thenValidationIsAvailable = (): void => {
    expect(designation.canValidate()).toBe(true);
  };
  const thenTheLocalReadFailureWasReported = (): void => {
    expect(errorHandler.errors).toEqual([new Error('Unavailable')]);
  };
  const thenPressIsRejected = (accepted: boolean): void => {
    expect(accepted).toBe(false);
  };
});
