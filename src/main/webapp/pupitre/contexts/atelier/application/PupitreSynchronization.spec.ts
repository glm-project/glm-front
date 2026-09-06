import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  GesteDAtelier,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { Injector } from '@angular/core';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { PupitreSynchronization } from './PupitreSynchronization';

const referenceFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };
const gesteFixture: GesteDAtelier = { id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean', nature: 'ARRIVEE' };
const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

class ServerFixture extends AtelierExchangePort {
  readonly received: GesteDAtelier[] = [];

  override async referentiel(): Promise<ReferentielDuPupitre> {
    await roundTrip();
    return referenceFixture;
  }
  override async send(geste: GesteDAtelier): Promise<void> {
    await roundTrip();
    this.received.push(structuredClone(geste));
  }
  override async reread(): Promise<void> {
    await roundTrip();
  }
}

class JournalFixture extends JournauxDuPupitreFixture {
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

describe('PupitreSynchronization', () => {
  let journal: JournalFixture;
  let server: ServerFixture;
  let synchronisation: PupitreSynchronization;
  let exposed: JournalDuPupitre | undefined;
  let token: string | undefined;

  beforeEach(() => {
    journal = new JournalFixture();
    server = new ServerFixture();
    exposed = undefined;
    token = undefined;
    synchronisation = Injector.create({
      providers: [
        PupitreSynchronization,
        { provide: JournauxDuPupitrePort, useValue: journal },
        { provide: AtelierExchangePort, useValue: server },
        {
          provide: AuthenticationPort,
          useValue: {
            synchronizeSession: roundTrip,
            currentTenant: () => 'entreprise-a',
            currentToken: () => token,
          },
        },
      ],
    }).get(PupitreSynchronization);
  });

  it('should restore the selected company without attempting to exchange its pending gestures when authorization expired', async () => {
    await givenASelectedCompanyWithPendingWork();

    await whenSynchronizing();

    thenPendingWorkRemainsAvailable();
    thenServerReceived();
  });

  it('should retry pending work after storage synchronization recovers', async () => {
    await givenASelectedCompanyWithPendingWork();
    givenAnAuthorizedSession();
    givenUnavailableStorage();

    const synchronization = whenSynchronizing();

    await thenSynchronizationFails(synchronization);
    whenStorageRecovers();

    await whenSynchronizing();

    thenServerReceived(gesteFixture);
  });

  const givenASelectedCompanyWithPendingWork = async (): Promise<void> => {
    await journal.saveReferentiel('entreprise-a', referenceFixture);
    await journal.append('entreprise-a', [gesteFixture]);
  };
  const givenAnAuthorizedSession = (): void => {
    token = 'autorise';
  };
  const givenUnavailableStorage = (): void => {
    journal.unavailable = true;
  };

  const whenSynchronizing = (): Promise<void> =>
    synchronisation.synchronize((_entreprise, state) => {
      exposed = state;
    });
  const whenStorageRecovers = (): void => {
    journal.unavailable = false;
  };
  const thenPendingWorkRemainsAvailable = (): void => {
    expect(exposed).toEqual({
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: referenceFixture,
      evenements: [{ geste: gesteFixture, etat: 'EN_ATTENTE' }],
    });
  };
  const thenSynchronizationFails = async (synchronization: Promise<void>): Promise<void> => {
    await expect(synchronization).rejects.toThrow('stockage indisponible');
  };
  const thenServerReceived = (...gestes: GesteDAtelier[]): void => {
    expect(server.received).toEqual(gestes);
  };
});
