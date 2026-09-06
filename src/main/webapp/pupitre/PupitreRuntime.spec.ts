import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { LocalGeste, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/LocalPupitreState';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';
import { PupitreServerPort } from '@/pupitre/contexts/atelier/domain/PupitreServerPort';
import { TestBed } from '@angular/core/testing';
import { PupitreJournalFixture } from '@test/unit/fixtures/PupitreJournalFixture';
import { offlineProvider } from './offline.provider';
import { PupitreRuntime } from './PupitreRuntime';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
const entrepriseFixture = 'entreprise-a';
const gesteFixture = (id: string): LocalGeste => ({ nature: 'ARRIVEE', id, dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' });

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

class ServerFixture extends PupitreServerPort {
  readonly received: LocalGeste[] = [];

  override async send(geste: LocalGeste): Promise<void> {
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

class JournalFixture extends PupitreJournalFixture {
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
  let authentication: AuthenticationFixture;
  let journal: JournalFixture;
  let serveur: ServerFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    authentication = new AuthenticationFixture();
    journal = new JournalFixture();
    serveur = new ServerFixture();
    TestBed.configureTestingModule({
      providers: [
        ...offlineProvider,
        { provide: PupitreJournalPort, useValue: journal },
        { provide: PupitreServerPort, useValue: serveur },
        { provide: AuthenticationPort, useValue: authentication },
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

    await whenStartingPupitre();

    await thenServerReceived('demarrage');
    await givenPendingGesture('reconnexion');

    whenNetworkReturns();

    await thenServerReceived('demarrage', 'reconnexion');
    await givenPendingGesture('horloge');

    await whenOneMinutePasses();

    await thenServerReceived('demarrage', 'reconnexion', 'horloge');
  });

  it('should leave new gestures pending after the runtime is destroyed', async () => {
    await givenPendingGesture('avant-destruction');
    await whenStartingPupitre();
    await thenServerReceived('avant-destruction');

    whenDestroyingTheRuntime();
    await givenPendingGesture('apres-destruction');

    whenNetworkReturns();
    await whenOneMinutePasses();

    await thenServerReceived('avant-destruction');
    await thenGestureRemainsPending('apres-destruction');
  });

  it('should retain a gesture after a background storage failure and send it on the next trigger', async () => {
    await givenPendingGesture('apres-panne');
    givenUnavailableStorage();

    await whenStartingWithoutStorage();
    whenStorageRecovers();

    await thenServerReceived();
    await thenGestureRemainsPending('apres-panne');

    whenNetworkReturns();

    await thenServerReceived('apres-panne');
  });

  const givenPendingGesture = (id: string): Promise<void> => journal.append(entrepriseFixture, [gesteFixture(id)]);
  const givenUnavailableStorage = (): void => {
    journal.unavailable = true;
  };
  const whenStartingPupitre = (): Promise<void> => runtime.start();
  const whenDestroyingTheRuntime = (): void => runtime.ngOnDestroy();
  const whenStartingWithoutStorage = async (): Promise<void> => {
    await runtime.start();
    await journal.synchronize(roundTrip).catch(() => undefined);
  };
  const whenStorageRecovers = (): void => {
    journal.unavailable = false;
  };
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
