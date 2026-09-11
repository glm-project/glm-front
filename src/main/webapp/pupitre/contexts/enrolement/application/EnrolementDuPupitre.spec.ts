import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import {
  ChargementDeLAtelier,
  ChargementDeLAtelierPort,
  IssueDuChargementDeLAtelier,
} from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { VueDEnrolement } from '@/pupitre/contexts/enrolement/domain/Enrolement';
import {
  DeviceAuthorizationCode,
  DeviceEnrolmentOutcome,
  DeviceEnrolmentPort,
  ShowDeviceAuthorizationCode,
} from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { EnrolementDuPupitre } from './EnrolementDuPupitre';

const MAINTENANT = 1_700_000_000_000;
const MILLISECONDS_PER_SECOND = 1_000;
const DIX_MINUTES_EN_SECONDES = 600;
const codeFixture: DeviceAuthorizationCode = {
  userCode: 'WDJB-MJHT',
  verificationUri: 'http://keycloak.test/realms/glm/device',
  verificationUriComplete: undefined,
  expiresIn: DIX_MINUTES_EN_SECONDES,
};

interface AttemptFixture {
  readonly showCode: ShowDeviceAuthorizationCode;
  readonly settle: (outcome: DeviceEnrolmentOutcome) => void;
}

interface WorkshopLoadFixture {
  readonly completion: Promise<IssueDuChargementDeLAtelier>;
  readonly settle: (issue: IssueDuChargementDeLAtelier) => void;
}

const workshopLoadFixture = (): WorkshopLoadFixture => {
  let settle: ((issue: IssueDuChargementDeLAtelier) => void) | undefined;
  const completion = new Promise<IssueDuChargementDeLAtelier>(resolve => {
    settle = resolve;
  });
  return { completion, settle: requiredFixture(settle, 'workshop load completion') };
};

class DeviceEnrolmentFixture extends DeviceEnrolmentPort {
  private readonly attempts: AttemptFixture[] = [];

  override enrol(showCode: ShowDeviceAuthorizationCode): Promise<DeviceEnrolmentOutcome> {
    return new Promise<DeviceEnrolmentOutcome>(settle => {
      this.attempts.push({ showCode, settle });
    });
  }

  count(): number {
    return this.attempts.length;
  }

  attempt(index: number): AttemptFixture {
    return requiredFixture(this.attempts[index], `enrolment attempt ${index}`);
  }

  first(): AttemptFixture {
    return this.attempt(0);
  }
}

class ChargementDeLAtelierFixture extends ChargementDeLAtelierPort {
  readonly referentielDisponible = signal(false);
  readonly connecte = signal(true);
  issue: IssueDuChargementDeLAtelier = 'CHARGE';
  nextLoad: WorkshopLoadFixture | undefined;

  override etat(): ChargementDeLAtelier {
    return { referentielDisponible: this.referentielDisponible(), connecte: this.connecte() };
  }

  override charger(): Promise<IssueDuChargementDeLAtelier> {
    const nextLoad = this.nextLoad;
    this.nextLoad = undefined;
    return nextLoad?.completion ?? Promise.resolve(this.issue);
  }
}

class AuthenticationFixture extends AuthenticationPort {
  revocations = 0;

  override authenticate(): Promise<void> {
    return Promise.resolve();
  }

  override currentToken(): string | undefined {
    return undefined;
  }

  override logout(): void {
    this.revocations += 1;
  }
}

describe('EnrolementDuPupitre', () => {
  let enrolement: EnrolementDuPupitre;
  let appareil: DeviceEnrolmentFixture;
  let atelier: ChargementDeLAtelierFixture;
  let authentication: AuthenticationFixture;
  let attempts: Promise<void>[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MAINTENANT);
    appareil = new DeviceEnrolmentFixture();
    atelier = new ChargementDeLAtelierFixture();
    authentication = new AuthenticationFixture();
    attempts = [];
    TestBed.configureTestingModule({
      providers: [
        EnrolementDuPupitre,
        { provide: DeviceEnrolmentPort, useValue: appareil },
        { provide: ChargementDeLAtelierPort, useValue: atelier },
        { provide: AuthenticationPort, useValue: authentication },
      ],
    });
    enrolement = TestBed.inject(EnrolementDuPupitre);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should ask the authorization server for a code as soon as it enrols', () => {
    whenEnrolling();

    thenTheScreenShows('DEMANDE_EN_COURS');
    thenAuthorizationsAskedAre(1);
  });

  it('should show the issued code and count the seconds down as the screen refreshes', () => {
    whenEnrolling();

    whenTheServerIssuesTheCode();

    thenSecondsLeftAre(DIX_MINUTES_EN_SECONDES);

    whenOneSecondPasses();

    thenSecondsLeftAre(DIX_MINUTES_EN_SECONDES - 1);
  });

  it('should expire the code by itself once its deadline has passed, without asking for another', () => {
    whenEnrolling();
    whenTheServerIssuesTheCode();

    whenTheCodeLifetimeElapses();

    thenTheScreenShows('EXPIRE');
    thenAuthorizationsAskedAre(1);
  });

  it('should load the workshop once the device is approved, then hand the screen over when its reference lands', async () => {
    whenEnrolling();
    whenTheServerIssuesTheCode();

    await whenTheAttemptAnswers('ENROLLED');

    thenTheScreenShows('VALIDE_CHARGEMENT_ATELIER');

    whenTheFirstReferenceLands();

    thenTheScreenShows('ENROLE_ET_PRET');
  });

  it('should wait for the network when it drops before the first reference lands', async () => {
    whenEnrolling();

    await whenTheAttemptAnswers('ENROLLED');
    whenTheNetworkDrops();

    thenTheScreenShows('ATTENTE_RESEAU_ATELIER');
  });

  it('should offer workshop load recovery when its first download fails', async () => {
    givenTheWorkshopLoadFails();
    whenEnrolling();

    await whenTheAttemptAnswers('ENROLLED');

    thenTheScreenShows('ATTENTE_RESEAU_ATELIER');
  });

  it.each([
    ['REFUSE', 'DENIED'],
    ['EXPIRE', 'EXPIRED'],
    ['ERREUR_RESEAU_INITIALE', 'UNREACHABLE'],
  ] satisfies readonly [VueDEnrolement['kind'], DeviceEnrolmentOutcome][])(
    'should show %s and load no workshop when the attempt answers %s',
    async (expected, outcome) => {
      whenEnrolling();

      await whenTheAttemptAnswers(outcome);

      thenTheScreenShows(expected);
    },
  );

  it('should keep asking when the attempt was abandoned rather than answered', async () => {
    whenEnrolling();

    await whenTheAttemptAnswers('ABANDONED');

    thenTheScreenShows('DEMANDE_EN_COURS');
  });

  it('should ignore the authorization code of an attempt a new request has replaced', () => {
    const nouveauCode: DeviceAuthorizationCode = {
      ...codeFixture,
      userCode: 'AAAA-BBBB',
    };
    whenEnrolling();
    whenAskingForANewCode();

    whenTheServerIssuesTheCode(codeFixture, 0);
    thenTheScreenShows('DEMANDE_EN_COURS');

    whenTheServerIssuesTheCode(nouveauCode, 1);
    thenTheScreenShows('EN_ATTENTE_D_APPROBATION');
    thenTheScreenShowsCode('AAAA-BBBB');
  });

  it('should ignore the answer of an attempt a new request has replaced', async () => {
    const nouveauCode: DeviceAuthorizationCode = {
      ...codeFixture,
      userCode: 'AAAA-BBBB',
    };
    whenEnrolling();
    whenAskingForANewCode();
    whenTheServerIssuesTheCode(nouveauCode, 1);

    await whenTheAttemptAnswers('DENIED', 0);

    thenTheScreenShows('EN_ATTENTE_D_APPROBATION');
    thenTheScreenShowsCode('AAAA-BBBB');
  });

  it('should ignore an approval for an attempt a new request has replaced', async () => {
    const nouveauCode: DeviceAuthorizationCode = {
      ...codeFixture,
      userCode: 'AAAA-BBBB',
    };
    whenEnrolling();
    whenAskingForANewCode();
    whenTheServerIssuesTheCode(nouveauCode, 1);

    await whenTheAttemptAnswers('ENROLLED', 0);

    thenTheScreenShows('EN_ATTENTE_D_APPROBATION');
    thenTheScreenShowsCode('AAAA-BBBB');
  });

  it('should retry the workshop load without asking for another code', async () => {
    givenTheWorkshopLoadFails();
    whenEnrolling();
    await whenTheAttemptAnswers('ENROLLED');
    thenTheScreenShows('ATTENTE_RESEAU_ATELIER');

    const retry = whenRetryingTheWorkshopLoad();
    thenTheScreenShows('VALIDE_CHARGEMENT_ATELIER');

    givenTheWorkshopLoadRecovers();
    await retry;
    whenTheFirstReferenceLands();

    thenTheScreenShows('ENROLE_ET_PRET');
  });

  it('should ignore a failed workshop load that a newer retry replaced', async () => {
    givenTheWorkshopLoadFails();
    whenEnrolling();
    await whenTheAttemptAnswers('ENROLLED');
    const previousLoad = givenTheNextWorkshopLoadWaits();
    const previousRetry = whenRetryingTheWorkshopLoad();
    const currentLoad = givenTheNextWorkshopLoadWaits();
    const currentRetry = whenRetryingTheWorkshopLoad();

    previousLoad.settle('ECHEC');
    await previousRetry;
    thenTheScreenShows('VALIDE_CHARGEMENT_ATELIER');

    currentLoad.settle('ECHEC');
    await currentRetry;
    thenTheScreenShows('ATTENTE_RESEAU_ATELIER');
  });

  it('should ignore a late failed workshop load after a newer retry has already succeeded', async () => {
    givenTheWorkshopLoadFails();
    whenEnrolling();
    await whenTheAttemptAnswers('ENROLLED');
    const previousLoad = givenTheNextWorkshopLoadWaits();
    const previousRetry = whenRetryingTheWorkshopLoad();
    const currentLoad = givenTheNextWorkshopLoadWaits();
    const currentRetry = whenRetryingTheWorkshopLoad();

    currentLoad.settle('CHARGE');
    await currentRetry;
    whenTheFirstReferenceLands();
    thenTheScreenShows('ENROLE_ET_PRET');

    previousLoad.settle('ECHEC');
    await previousRetry;

    thenTheScreenShows('ENROLE_ET_PRET');
  });

  it('should ignore a workshop load settling after the pupitre was reset', async () => {
    whenEnrolling();
    await whenTheAttemptAnswers('ENROLLED');
    const pendingLoad = givenTheNextWorkshopLoadWaits();
    const retry = whenRetryingTheWorkshopLoad();

    whenResetting();

    pendingLoad.settle('CHARGE');
    await retry;

    thenTheScreenShows('DEMANDE_EN_COURS');
  });

  it('should revoke the durable enrolment before asking for a new code', () => {
    whenResetting();

    thenRevocationsAre(1);
    thenAuthorizationsAskedAre(1);
    thenTheScreenShows('DEMANDE_EN_COURS');
  });

  const whenEnrolling = (): void => {
    attempts.push(enrolement.enroler());
  };

  const whenAskingForANewCode = (): void => {
    attempts.push(enrolement.enroler());
  };

  const whenResetting = (): void => {
    attempts.push(enrolement.reinitialiser());
  };

  const whenRetryingTheWorkshopLoad = (): Promise<void> => enrolement.chargerLAtelier();

  const whenTheServerIssuesTheCode = (code: DeviceAuthorizationCode = codeFixture, index = 0): void => {
    appareil.attempt(index).showCode(code);
  };

  const whenTheAttemptAnswers = async (outcome: DeviceEnrolmentOutcome, index = 0): Promise<void> => {
    appareil.attempt(index).settle(outcome);
    await requiredFixture(attempts[index], 'enrolment in progress');
  };

  const whenOneSecondPasses = (): void => {
    whenTheClockReaches(MAINTENANT + MILLISECONDS_PER_SECOND);
  };

  const whenTheCodeLifetimeElapses = (): void => {
    whenTheClockReaches(MAINTENANT + DIX_MINUTES_EN_SECONDES * MILLISECONDS_PER_SECOND);
  };

  const whenTheClockReaches = (instant: number): void => {
    vi.setSystemTime(instant);
    enrolement.rafraichir();
  };

  const whenTheFirstReferenceLands = (): void => {
    atelier.referentielDisponible.set(true);
  };

  const whenTheNetworkDrops = (): void => {
    atelier.connecte.set(false);
  };

  const givenTheWorkshopLoadFails = (): void => {
    atelier.issue = 'ECHEC';
  };

  const givenTheNextWorkshopLoadWaits = (): WorkshopLoadFixture => {
    const load = workshopLoadFixture();
    atelier.nextLoad = load;
    return load;
  };

  const givenTheWorkshopLoadRecovers = (): void => {
    atelier.issue = 'CHARGE';
  };

  const thenTheScreenShows = (expected: VueDEnrolement['kind']): void => {
    expect(enrolement.vue().kind).toBe(expected);
  };

  const thenTheScreenShowsCode = (userCode: string): void => {
    const vue = enrolement.vue();
    expect(vue.kind === 'EN_ATTENTE_D_APPROBATION' ? vue.code.userCode : undefined).toBe(userCode);
  };

  const thenSecondsLeftAre = (secondes: number): void => {
    const vue = enrolement.vue();
    expect(vue.kind === 'EN_ATTENTE_D_APPROBATION' ? vue.code.secondesRestantes : undefined).toBe(secondes);
  };

  const thenAuthorizationsAskedAre = (count: number): void => {
    expect(appareil.count()).toBe(count);
  };

  const thenRevocationsAre = (count: number): void => {
    expect(authentication.revocations).toBe(count);
  };
});
