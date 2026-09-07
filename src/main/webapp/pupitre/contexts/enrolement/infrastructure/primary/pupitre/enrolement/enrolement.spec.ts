import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { VueDEnrolement } from '@/pupitre/contexts/enrolement/domain/Enrolement';
import { ErrorHandler, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { Enrolement } from './enrolement';

const codeFixture = {
  userCode: 'WDJB-MJHT',
  verificationUri: 'http://keycloak.test/realms/glm/device',
  lienDeValidation: 'http://keycloak.test/realms/glm/device?user_code=WDJB-MJHT',
  secondesRestantes: 125,
};

class EnrolementDuPupitreFixture {
  readonly vue = signal<VueDEnrolement>({ kind: 'DEMANDE_EN_COURS' });
  refreshes = 0;
  requests = 0;
  loads = 0;
  requestFails = false;

  rafraichir(): void {
    this.refreshes += 1;
  }

  enroler(): Promise<void> {
    this.requests += 1;
    return this.requestFails ? Promise.reject(new Error('enrôlement indisponible')) : Promise.resolve();
  }

  chargerLAtelier(): Promise<void> {
    this.loads += 1;
    return Promise.resolve();
  }
}

class ScreenErrorHandlerFixture extends ErrorHandler {
  failure: unknown;

  override handleError(failure: unknown): void {
    this.failure = failure;
  }
}

describe('Enrolement screen', () => {
  let fixture: ComponentFixture<Enrolement>;
  let enrolement: EnrolementDuPupitreFixture;
  let errorHandler: ScreenErrorHandlerFixture;

  beforeEach(() => {
    vi.useFakeTimers();
    enrolement = new EnrolementDuPupitreFixture();
    errorHandler = new ScreenErrorHandlerFixture();
    TestBed.configureTestingModule({
      imports: [Enrolement],
      providers: [
        { provide: EnrolementDuPupitre, useValue: enrolement },
        { provide: ErrorHandler, useValue: errorHandler },
      ],
    });
    fixture = TestBed.createComponent(Enrolement);
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('should show the code, its address and the time left while approval is awaited', () => {
    givenTheScreenShows({ kind: 'EN_ATTENTE_D_APPROBATION', code: codeFixture });

    whenRendering();

    thenItReads('user-code', 'WDJB-MJHT');
    thenItReads('verification-uri', 'Ou rendez-vous sur http://keycloak.test/realms/glm/device');
    thenItReads('countdown', 'Expire dans 02:05');
    thenItReads('enrolement-status', "En attente de validation par l'administrateur");
    thenTheQrCodeIsDrawn();
  });

  it('should encode the validation link, not the address printed beside it', () => {
    givenTheScreenShows({ kind: 'EN_ATTENTE_D_APPROBATION', code: codeFixture });
    whenRendering();
    const scanned = whatTheQrCodeDraws();

    givenTheScreenShows({
      kind: 'EN_ATTENTE_D_APPROBATION',
      code: { ...codeFixture, lienDeValidation: `${codeFixture.lienDeValidation}&session=42` },
    });
    whenRendering();

    thenTheQrCodeChangedFrom(scanned);
  });

  it('should show only the status while the authorization is being requested', () => {
    givenTheScreenShows({ kind: 'DEMANDE_EN_COURS' });

    whenRendering();

    thenItReads('enrolement-status', "Demande d'autorisation en cours…");
    thenThereIsNoAction();
  });

  it.each([
    ['Demander un nouveau code', 'EXPIRE', "Le code d'autorisation a expiré"],
    ['Recommencer', 'REFUSE', "Autorisation refusée par l'administrateur"],
    ['Réessayer', 'ERREUR_RESEAU_INITIALE', "Connexion Internet requise pour enrôler l'appareil"],
  ] satisfies readonly [string, VueDEnrolement['kind'], string][])(
    'should offer "%s" and ask for a new authorization when the enrolment ends in %s',
    (action, kind, statut) => {
      givenTheScreenShows({ kind });

      whenRendering();
      whenPressingTheAction();

      thenItReads('enrolement-status', statut);
      thenTheActionReads(action);
      thenAuthorizationRequestsAre(1);
    },
  );

  it('should retry the workshop load, not the enrolment, while its first reference is missing', () => {
    givenTheScreenShows({ kind: 'ATTENTE_RESEAU_ATELIER' });

    whenRendering();
    whenPressingTheAction();

    thenItReads('enrolement-status', "Appareil validé — En attente de connexion pour charger l'atelier");
    thenWorkshopLoadsAre(1);
    thenAuthorizationRequestsAre(0);
  });

  it('should say the workshop is loading, with nothing for the operator to do', () => {
    givenTheScreenShows({ kind: 'VALIDE_CHARGEMENT_ATELIER' });

    whenRendering();

    thenItReads('enrolement-status', "Appareil validé — Chargement de l'atelier en cours...");
    thenThereIsNoAction();
  });

  it('should push the clock forward every second while it is on screen, and stop once it leaves', () => {
    givenTheScreenShows({ kind: 'EN_ATTENTE_D_APPROBATION', code: codeFixture });
    whenRendering();

    whenTwoSecondsPass();

    thenClockPushesAre(2);

    whenLeavingTheScreen();
    whenTwoSecondsPass();

    thenClockPushesAre(2);
  });

  it('should report a failed request instead of leaving it unobserved', async () => {
    givenTheScreenShows({ kind: 'EXPIRE' });
    givenTheNextRequestFails();

    whenRendering();
    whenPressingTheAction();
    await whenTheRequestSettles();

    thenTheFailureWasReported();
  });

  const givenTheScreenShows = (vue: VueDEnrolement): void => {
    enrolement.vue.set(vue);
  };

  const givenTheNextRequestFails = (): void => {
    enrolement.requestFails = true;
  };

  const whenRendering = (): void => {
    fixture.detectChanges();
  };

  const whenPressingTheAction = (): void => {
    element('enrolement-action').click();
    fixture.detectChanges();
  };

  const whenTwoSecondsPass = (): void => {
    vi.advanceTimersByTime(2_000);
  };

  const whenLeavingTheScreen = (): void => {
    fixture.destroy();
  };

  const whenTheRequestSettles = (): Promise<void> => Promise.resolve();

  const thenItReads = (selector: string, expected: string): void => {
    expect(element(selector).textContent.trim()).toBe(expected);
  };

  const thenTheActionReads = (expected: string): void => {
    expect(element('enrolement-action').textContent.trim()).toBe(expected);
  };

  const thenThereIsNoAction = (): void => {
    expect(root().querySelector(dataSelector('enrolement-action'))).toBeNull();
  };

  const whatTheQrCodeDraws = (): string => element('qr-modules').getAttribute('d') ?? '';

  const thenTheQrCodeIsDrawn = (): void => {
    expect(whatTheQrCodeDraws().length).toBeGreaterThan(0);
  };

  const thenTheQrCodeChangedFrom = (previous: string): void => {
    expect(whatTheQrCodeDraws()).not.toBe(previous);
  };

  const thenAuthorizationRequestsAre = (count: number): void => {
    expect(enrolement.requests).toBe(count);
  };

  const thenWorkshopLoadsAre = (count: number): void => {
    expect(enrolement.loads).toBe(count);
  };

  const thenClockPushesAre = (count: number): void => {
    expect(enrolement.refreshes).toBe(count);
  };

  const thenTheFailureWasReported = (): void => {
    expect(errorHandler.failure).toEqual(new Error('enrôlement indisponible'));
  };

  const element = (selector: string): HTMLElement => {
    const selected = root().querySelector<HTMLElement>(dataSelector(selector));
    if (selected === null) throw new Error(`Missing ${selector} fixture.`);
    return selected;
  };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
});
