import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDAtelier,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { IndexedDbLocalStorage } from '@/pupitre/shared/local-storage/infrastructure/secondary/IndexedDbLocalStorage';
import { TestBed } from '@angular/core/testing';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbJournauxDuPupitre } from './local/IndexedDbJournauxDuPupitre';

const referenceFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };
const refreshedReferenceFixture: ReferentielDuPupitre = {
  operateurs: [],
  suivis: [
    { id: 'piece', nom: 'OF-1', etat: 'EN_ATTENTE', type: 'PRODUIT', activites: [], evenements: [] },
    { id: 'autre-piece', nom: 'OF-2', etat: 'EN_ATTENTE', type: 'PRODUIT', activites: [], evenements: [] },
  ],
};
const arriveeFixture: GesteDAtelier = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const repriseFixture: GesteDAtelier = { ...arriveeFixture, id: 'reprise', nature: 'PRESENCE', type: 'REPRISE', implicite: true };
const pointageFixture: GesteDAtelier = { ...arriveeFixture, id: 'pointage', nature: 'POINTAGE', type: 'DEBUT', suiviId: 'piece' };
const pointageEnAttenteFixture: GesteDAtelier = {
  ...arriveeFixture,
  id: 'pointage-attente',
  nature: 'POINTAGE',
  type: 'DEBUT',
  suiviId: 'piece',
};
const pointageAutreSuiviFixture: GesteDAtelier = {
  ...arriveeFixture,
  id: 'pointage-autre',
  nature: 'POINTAGE',
  type: 'DEBUT',
  suiviId: 'autre-piece',
};

const adapters = [
  ['local storage', () => TestBed.inject(IndexedDbJournauxDuPupitre)],
  ['application fixture', () => new JournauxDuPupitreFixture()],
] as const;

interface SynchronizationFixture {
  entered: SignalFixture;
  release: SignalFixture;
  chronology: string[];
}

const givenSynchronizationSignals = (): SynchronizationFixture => ({
  entered: new SignalFixture(),
  release: new SignalFixture(),
  chronology: [],
});
const whenTheFirstOperationHasEntered = (entered: SignalFixture): Promise<void> => entered.promise;
const whenReleasingOperation = async (release: SignalFixture, operation: Promise<void>): Promise<void> => {
  release.release();
  await operation;
};
const thenChronologyIs = (chronology: string[], expected: string[]): void => {
  expect(chronology).toEqual(expected);
};

describe.each(adapters)('JournauxDuPupitrePort contract, honoured by %s', (_name, build) => {
  let journal: JournauxDuPupitrePort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    TestBed.configureTestingModule({
      providers: [IndexedDbJournauxDuPupitre, { provide: LocalStoragePort, useClass: IndexedDbLocalStorage }],
    });
    journal = build();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('should restore an empty company before its first reference or gesture', async () => {
    const state = await whenReadingCompany('entreprise-a');

    thenStateIs(state, EMPTY_JOURNAL_DU_PUPITRE);
  });

  it('should retain the complete opening in order and keep another company independent', async () => {
    await givenACompanyReference();

    await whenAppendingTheCompleteOpening();

    await thenCompanyStateIs('entreprise-a', completeOpeningFixture());
    await thenCompanyStateIs('entreprise-b', EMPTY_JOURNAL_DU_PUPITRE);
  });

  it('should preserve a concurrent append and a refusal while recording a push outcome', async () => {
    const refus = await givenADisconnectedQueue();

    await whenSavingARefusalWhileAppending(refus);

    await thenCompanyStateIs('entreprise-a', {
      connecte: true,
      evenements: [refus, { geste: repriseFixture, etat: 'EN_ATTENTE' }, { geste: pointageFixture, etat: 'EN_ATTENTE' }],
    });
  });

  it('should retain its audit trail while registering accepted pointages in a fresh reference', async () => {
    await givenAnAcceptedGestureAndAPendingOne();

    const state = await whenSavingAFreshReference();

    thenStateIs(state, {
      referentiel: {
        ...refreshedReferenceFixture,
        suivis: [
          { ...requiredFixture(refreshedReferenceFixture.suivis[0], 'refreshed workshop element'), evenements: ['pointage'] },
          { ...requiredFixture(refreshedReferenceFixture.suivis[1], 'other refreshed workshop element'), evenements: ['pointage-autre'] },
        ],
      },
      connecte: true,
      evenements: [
        { geste: pointageFixture, etat: 'ACCEPTE' },
        { geste: pointageEnAttenteFixture, etat: 'EN_ATTENTE' },
        { geste: pointageAutreSuiviFixture, etat: 'ACCEPTE' },
        { geste: repriseFixture, etat: 'ACCEPTE' },
      ],
    });
  });

  it('should record disconnected state when synchronization marks the company offline', async () => {
    await givenACompanyReference();

    const state = await whenMarkingCompanyDisconnected('entreprise-a');

    thenStateIs(state, {
      referentiel: referenceFixture,
      connecte: false,
      evenements: [],
    });
  });

  it.each(['synchronize', 'withSession'] as const)('should serialize %s operations while allowing local capture', async operation => {
    const { entered, release, chronology } = givenSynchronizationSignals();

    const first = whenHoldingTheFirstOperation(operation, entered, release, chronology);
    await whenTheFirstOperationHasEntered(entered);

    const second = whenStartingTheSecondOperation(operation, chronology);
    await whenAppendingArrival();

    await thenOnlyTheFirstOperationRunsUntilReleased(chronology, release, first, second);

    thenChronologyIs(chronology, ['first', 'second']);
  });

  it('should allow synchronization and session operations to run concurrently', async () => {
    const { entered, release, chronology } = givenSynchronizationSignals();

    const sync = whenHoldingSynchronization(entered, release, chronology);
    await whenTheFirstOperationHasEntered(entered);

    await whenRunningSessionOperation(chronology);

    thenChronologyIs(chronology, ['sync-entered', 'session-run']);

    await whenReleasingOperation(release, sync);

    thenChronologyIs(chronology, ['sync-entered', 'session-run', 'sync-released']);
  });

  const givenACompanyReference = async (): Promise<void> => {
    await journal.saveReferentiel('entreprise-a', referenceFixture);
  };

  const completeOpeningFixture = (): JournalDuPupitre => ({
    referentiel: referenceFixture,
    connecte: true,
    evenements: [arriveeFixture, repriseFixture, pointageFixture].map(geste => ({ geste, etat: 'EN_ATTENTE' })),
  });
  const givenADisconnectedQueue = async (): Promise<EvenementDuJournal> => {
    await journal.append('entreprise-a', [arriveeFixture, repriseFixture]);
    await journal.markDisconnected('entreprise-a');
    return { geste: arriveeFixture, etat: 'REFUSE', refus: { code: 'cause', message: 'cause conservee' } };
  };
  const givenAnAcceptedGestureAndAPendingOne = async (): Promise<void> => {
    await journal.append('entreprise-a', [pointageFixture, pointageEnAttenteFixture, pointageAutreSuiviFixture, repriseFixture]);
    await journal.saveResult('entreprise-a', { geste: pointageFixture, etat: 'ACCEPTE' });
    await journal.saveResult('entreprise-a', { geste: pointageAutreSuiviFixture, etat: 'ACCEPTE' });
    await journal.saveResult('entreprise-a', { geste: repriseFixture, etat: 'ACCEPTE' });
  };

  const thenOnlyTheFirstOperationRunsUntilReleased = async (
    chronology: string[],
    release: SignalFixture,
    first: Promise<void>,
    second: Promise<void>,
  ): Promise<void> => {
    try {
      thenChronologyIs(chronology, ['first']);
    } finally {
      await whenReleasingTheOperations(release, first, second);
    }
  };
  const whenReadingCompany = (company: string): Promise<JournalDuPupitre> => journal.read(company);
  const whenAppendingTheCompleteOpening = (): Promise<void> =>
    journal.append('entreprise-a', [arriveeFixture, repriseFixture, pointageFixture]);
  const whenAppendingArrival = (): Promise<void> => journal.append('entreprise-a', [arriveeFixture]);
  const whenSavingAFreshReference = (): Promise<JournalDuPupitre> => journal.saveReferentiel('entreprise-a', refreshedReferenceFixture);
  const whenMarkingCompanyDisconnected = (company: string): Promise<JournalDuPupitre> => journal.markDisconnected(company);
  const whenSavingARefusalWhileAppending = async (refusal: EvenementDuJournal): Promise<void> => {
    await Promise.all([journal.saveResult('entreprise-a', refusal), journal.append('entreprise-a', [pointageFixture])]);
  };
  const whenHoldingTheFirstOperation = (
    operation: 'synchronize' | 'withSession',
    entered: SignalFixture,
    release: SignalFixture,
    chronology: string[],
  ): Promise<void> =>
    journal[operation](async () => {
      chronology.push('first');
      entered.release();
      await release.promise;
    });
  const whenHoldingSynchronization = (entered: SignalFixture, release: SignalFixture, chronology: string[]): Promise<void> =>
    journal.synchronize(async () => {
      chronology.push('sync-entered');
      entered.release();
      await release.promise;
      chronology.push('sync-released');
    });
  const whenRunningSessionOperation = (chronology: string[]): Promise<void> =>
    journal.withSession(() => {
      chronology.push('session-run');
      return Promise.resolve();
    });
  const whenStartingTheSecondOperation = (operation: 'synchronize' | 'withSession', chronology: string[]): Promise<void> =>
    journal[operation](async () => {
      await new Promise(resolve => setTimeout(resolve));
      chronology.push('second');
    });
  const whenReleasingTheOperations = async (release: SignalFixture, ...operations: Promise<void>[]): Promise<void> => {
    release.release();
    await Promise.all(operations);
  };

  const thenStateIs = (state: JournalDuPupitre, expected: JournalDuPupitre): void => {
    expect(state).toEqual(expected);
  };
  const thenCompanyStateIs = async (company: string, expected: JournalDuPupitre): Promise<void> => {
    thenStateIs(await journal.read(company), expected);
  };
});

describe('IndexedDbJournauxDuPupitre compatibility', () => {
  let journal: IndexedDbJournauxDuPupitre;
  let storage: LocalStoragePort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    TestBed.configureTestingModule({
      providers: [IndexedDbJournauxDuPupitre, { provide: LocalStoragePort, useClass: IndexedDbLocalStorage }],
    });
    journal = TestBed.inject(IndexedDbJournauxDuPupitre);
    storage = TestBed.inject(LocalStoragePort);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('should restore a legacy accepted arrival without inventing that it opened the day', async () => {
    await givenALegacyAcceptedArrival();

    const state = await whenReadingCompany('entreprise-a');

    thenEventsAre(state, [{ geste: arriveeFixture, etat: 'ACCEPTE', journeeOuverte: false }]);
  });

  it('should acquire the storage synchronisation lock when synchronizing', async () => {
    const { entered, release, chronology } = givenSynchronizationSignals();

    const held = whenHoldingStorageLock(storage, 'synchronisation', entered, release, chronology);
    await whenTheFirstOperationHasEntered(entered);

    const queued = whenStartingSynchronization(journal, chronology);
    await whenAllowingTurnToEnter();

    thenChronologyIs(chronology, ['lock-entered']);

    await whenReleasingOperation(release, held);
    await queued;

    thenChronologyIs(chronology, ['lock-entered', 'lock-released', 'journal-run']);
  });

  it('should acquire the storage session lock during session execution', async () => {
    const { entered, release, chronology } = givenSynchronizationSignals();

    const held = whenHoldingStorageLock(storage, 'session', entered, release, chronology);
    await whenTheFirstOperationHasEntered(entered);

    const queued = whenStartingSession(journal, chronology);
    await whenAllowingTurnToEnter();

    thenChronologyIs(chronology, ['lock-entered']);

    await whenReleasingOperation(release, held);
    await queued;

    thenChronologyIs(chronology, ['lock-entered', 'lock-released', 'journal-run']);
  });

  const givenALegacyAcceptedArrival = async (): Promise<void> => {
    const legacy = { connecte: true, evenements: [{ geste: arriveeFixture, etat: 'ACCEPTE' as const }] };
    await storage.update('atelier:entreprise-a', legacy, () => legacy);
  };
  const whenReadingCompany = (company: string): Promise<JournalDuPupitre> => journal.read(company);
  const whenHoldingStorageLock = (
    store: LocalStoragePort,
    lockName: string,
    entered: SignalFixture,
    release: SignalFixture,
    chronology: string[],
  ): Promise<void> =>
    store.lock(lockName, async () => {
      chronology.push('lock-entered');
      entered.release();
      await release.promise;
      chronology.push('lock-released');
    });
  const whenStartingSynchronization = (j: IndexedDbJournauxDuPupitre, chronology: string[]): Promise<void> =>
    j.synchronize(() => {
      chronology.push('journal-run');
      return Promise.resolve();
    });
  const whenStartingSession = (j: IndexedDbJournauxDuPupitre, chronology: string[]): Promise<void> =>
    j.withSession(() => {
      chronology.push('journal-run');
      return Promise.resolve();
    });
  const whenAllowingTurnToEnter = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
  const thenEventsAre = (state: JournalDuPupitre, expected: EvenementDuJournal[]): void => {
    expect(state.evenements).toEqual(expected);
  };
});
