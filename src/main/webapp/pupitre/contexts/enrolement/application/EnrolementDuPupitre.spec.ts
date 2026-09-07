import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ChargementDeLAtelier, ChargementDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
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

  first(): AttemptFixture {
    return requiredFixture(this.attempts[0], 'enrolment attempt');
  }
}

class ChargementDeLAtelierFixture extends ChargementDeLAtelierPort {
  readonly referentielDisponible = signal(false);
  readonly connecte = signal(true);
  loads = 0;

  override etat(): ChargementDeLAtelier {
    return { referentielDisponible: this.referentielDisponible(), connecte: this.connecte() };
  }

  override charger(): Promise<void> {
    this.loads += 1;
    return Promise.resolve();
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
    thenWorkshopLoadsAre(1);

    whenTheFirstReferenceLands();

    thenTheScreenShows('ENROLE_ET_PRET');
  });

  it('should wait for the network when it drops before the first reference lands', async () => {
    whenEnrolling();

    await whenTheAttemptAnswers('ENROLLED');
    whenTheNetworkDrops();

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
      thenWorkshopLoadsAre(0);
    },
  );

  it('should keep asking when the attempt was abandoned rather than answered', async () => {
    whenEnrolling();

    await whenTheAttemptAnswers('ABANDONED');

    thenTheScreenShows('DEMANDE_EN_COURS');
    thenWorkshopLoadsAre(0);
  });

  it('should ignore the code and the answer of an attempt a new request has replaced', async () => {
    whenEnrolling();
    whenAskingForANewCode();

    whenTheServerIssuesTheCode();
    await whenTheAttemptAnswers('DENIED');

    thenTheScreenShows('DEMANDE_EN_COURS');
    thenAuthorizationsAskedAre(2);
  });

  it('should retry the workshop load without asking for another code', async () => {
    whenEnrolling();
    await whenTheAttemptAnswers('ENROLLED');

    await whenRetryingTheWorkshopLoad();

    thenWorkshopLoadsAre(2);
    thenAuthorizationsAskedAre(1);
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

  const whenTheServerIssuesTheCode = (): void => {
    appareil.first().showCode(codeFixture);
  };

  const whenTheAttemptAnswers = async (outcome: DeviceEnrolmentOutcome): Promise<void> => {
    appareil.first().settle(outcome);
    await requiredFixture(attempts[0], 'enrolment in progress');
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

  const thenTheScreenShows = (expected: VueDEnrolement['kind']): void => {
    expect(enrolement.vue().kind).toBe(expected);
  };

  const thenSecondsLeftAre = (secondes: number): void => {
    const vue = enrolement.vue();
    expect(vue.kind === 'EN_ATTENTE_D_APPROBATION' ? vue.code.secondesRestantes : undefined).toBe(secondes);
  };

  const thenAuthorizationsAskedAre = (count: number): void => {
    expect(appareil.count()).toBe(count);
  };

  const thenWorkshopLoadsAre = (count: number): void => {
    expect(atelier.loads).toBe(count);
  };

  const thenRevocationsAre = (count: number): void => {
    expect(authentication.revocations).toBe(count);
  };
});
