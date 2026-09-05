import { PupitreHorsLigne } from '@/app/atelier/application/PupitreHorsLigne';
import { SynchronisationDuPupitre } from '@/app/atelier/application/SynchronisationDuPupitre';
import { JournalDuPupitrePort } from '@/app/atelier/domain/JournalDuPupitrePort';
import { GesteLocal, ReferentielDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { TestBed } from '@angular/core/testing';
import { JournalDuPupitreFixture } from '@test/unit/fixtures/JournalDuPupitreFixture';
import { PupitreRuntime } from './PupitreRuntime';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
const entrepriseFixture = 'entreprise-a';
const gesteFixture = (id: string): GesteLocal => ({ nature: 'ARRIVEE', id, dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' });

class AuthenticationFixture extends AuthenticationPort {
  override async authenticate(): Promise<void> {
    await roundTrip();
  }
  override currentToken(): string {
    return 'autorise';
  }
  override currentTenant(): string {
    return entrepriseFixture;
  }
  override logout(): void {
    throw new Error('La session fixture reste ouverte.');
  }
}

class ServeurFixture extends ServeurDuPupitrePort {
  readonly received: GesteLocal[] = [];
  override async send(geste: GesteLocal): Promise<void> {
    await roundTrip();
    this.received.push(structuredClone(geste));
  }
  override async referentiel(): Promise<ReferentielDuPupitre> {
    await roundTrip();
    return { operateurs: [], suivis: [] };
  }
  override async reread(): Promise<void> {
    await roundTrip();
  }
}

class JournalFixture extends JournalDuPupitreFixture {
  unavailable = false;
  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return super.synchronize(async () => {
      await roundTrip();
      if (this.unavailable) {
        throw new Error('stockage indisponible');
      }
      return action();
    });
  }
}

describe('PupitreRuntime', () => {
  let runtime: PupitreRuntime;
  let journal: JournalFixture;
  let serveur: ServeurFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    journal = new JournalFixture();
    serveur = new ServeurFixture();
    TestBed.configureTestingModule({
      providers: [
        PupitreRuntime,
        PupitreHorsLigne,
        SynchronisationDuPupitre,
        { provide: JournalDuPupitrePort, useValue: journal },
        { provide: ServeurDuPupitrePort, useValue: serveur },
        { provide: AuthenticationPort, useClass: AuthenticationFixture },
      ],
    });
    runtime = TestBed.inject(PupitreRuntime);
  });
  afterEach(() => {
    runtime.ngOnDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should send pending gestures at startup, reconnection and every minute', async () => {
    await givenPendingGesture('demarrage');

    runtime.start();

    await thenServerReceived('demarrage');
    await givenPendingGesture('reconnexion');

    whenNetworkReturns();

    await thenServerReceived('demarrage', 'reconnexion');
    await givenPendingGesture('horloge');

    await whenOneMinutePasses();

    await thenServerReceived('demarrage', 'reconnexion', 'horloge');
  });

  it('should leave new gestures pending after the shell is destroyed', async () => {
    await givenPendingGesture('avant-destruction');
    runtime.start();
    await thenServerReceived('avant-destruction');
    runtime.ngOnDestroy();
    await givenPendingGesture('apres-destruction');

    whenNetworkReturns();
    await whenOneMinutePasses();

    await thenServerReceived('avant-destruction');
    await thenGestureRemainsPending('apres-destruction');
  });

  it('should retain a gesture after a background storage failure and send it on the next trigger', async () => {
    await givenPendingGesture('apres-panne');
    journal.unavailable = true;

    runtime.start();
    await journal.synchronize(roundTrip).catch(() => undefined);
    journal.unavailable = false;

    await thenServerReceived();
    await thenGestureRemainsPending('apres-panne');

    whenNetworkReturns();

    await thenServerReceived('apres-panne');
  });

  const givenPendingGesture = (id: string): Promise<void> => journal.append(entrepriseFixture, [gesteFixture(id)]);
  const whenNetworkReturns = (): void => {
    window.dispatchEvent(new Event('online'));
  };
  const whenOneMinutePasses = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(60_000);
  };
  const thenServerReceived = async (...ids: string[]): Promise<void> => {
    await journal.synchronize(async () => {
      await roundTrip();
      expect(serveur.received).toEqual(ids.map(gesteFixture));
    });
  };
  const thenGestureRemainsPending = async (id: string): Promise<void> => {
    const state = await journal.read(entrepriseFixture);
    expect(state.evenements).toContainEqual({ geste: gesteFixture(id), etat: 'EN_ATTENTE' });
  };
});
