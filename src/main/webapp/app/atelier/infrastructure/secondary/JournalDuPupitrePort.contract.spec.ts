import { JournalDuPupitrePort } from '@/app/atelier/domain/JournalDuPupitrePort';
import { EvenementLocal, GesteLocal, PUPITRE_VIDE, PupitreLocal, ReferentielDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { StockageLocalPort } from '@/app/shared/stockage-local/domain/StockageLocalPort';
import { IndexedDbStockageLocal } from '@/app/shared/stockage-local/infrastructure/secondary/IndexedDbStockageLocal';
import { TestBed } from '@angular/core/testing';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { JournalDuPupitreFixture } from '@test/unit/fixtures/JournalDuPupitreFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { IDBFactory } from 'fake-indexeddb';
import { JournalLocalDuPupitre } from './local/JournalLocalDuPupitre';

const referenceFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };
const refreshedReferenceFixture: ReferentielDuPupitre = {
  operateurs: [],
  suivis: [{ id: 'piece', nom: 'OF-1', etat: 'EN_ATTENTE', type: 'PRODUIT', activites: [], evenements: [] }],
};
const arriveeFixture: GesteLocal = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const repriseFixture: GesteLocal = { ...arriveeFixture, id: 'reprise', nature: 'PRESENCE', type: 'REPRISE', implicite: true };
const pointageFixture: GesteLocal = { ...arriveeFixture, id: 'pointage', nature: 'POINTAGE', type: 'DEBUT', suiviId: 'piece' };

const adapters = [
  ['local storage', () => TestBed.inject(JournalLocalDuPupitre)],
  ['application fixture', () => new JournalDuPupitreFixture()],
] as const;

interface SynchronizationFixture {
  entered: SignalFixture;
  release: SignalFixture;
  chronology: string[];
}

describe.each(adapters)('JournalDuPupitrePort contract, honoured by %s', (_name, build) => {
  let journal: JournalDuPupitrePort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    TestBed.configureTestingModule({
      providers: [JournalLocalDuPupitre, { provide: StockageLocalPort, useClass: IndexedDbStockageLocal }],
    });
    journal = build();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('should restore an empty company before its first reference or gesture', async () => {
    const state = await whenReadingCompany('entreprise-a');

    thenStateIs(state, PUPITRE_VIDE);
  });

  it('should retain the complete opening in order and keep another company independent', async () => {
    await givenACompanyReference();

    await whenAppendingTheCompleteOpening();

    await thenCompanyStateIs('entreprise-a', completeOpeningFixture());
    await thenCompanyStateIs('entreprise-b', PUPITRE_VIDE);
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
        suivis: [{ ...refreshedReferenceFixture.suivis[0], evenements: ['pointage'] }],
      },
      connecte: true,
      evenements: [
        { geste: pointageFixture, etat: 'ACCEPTE' },
        { geste: repriseFixture, etat: 'EN_ATTENTE' },
      ],
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

  const givenACompanyReference = async (): Promise<void> => {
    await journal.saveReferentiel('entreprise-a', referenceFixture);
  };

  const completeOpeningFixture = (): PupitreLocal => ({
    referentiel: referenceFixture,
    connecte: true,
    evenements: [arriveeFixture, repriseFixture, pointageFixture].map(geste => ({ geste, etat: 'EN_ATTENTE' })),
  });
  const givenADisconnectedQueue = async (): Promise<EvenementLocal> => {
    await journal.append('entreprise-a', [arriveeFixture, repriseFixture]);
    await journal.markDisconnected('entreprise-a');
    return { geste: arriveeFixture, etat: 'REFUSE', refus: { code: 'cause', message: 'cause conservee' } };
  };
  const givenAnAcceptedGestureAndAPendingOne = async (): Promise<void> => {
    await journal.append('entreprise-a', [pointageFixture, repriseFixture]);
    await journal.saveResult('entreprise-a', { geste: pointageFixture, etat: 'ACCEPTE' });
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
  const givenSynchronizationSignals = (): SynchronizationFixture => ({
    entered: new SignalFixture(),
    release: new SignalFixture(),
    chronology: [],
  });
  const whenReadingCompany = (company: string): Promise<PupitreLocal> => journal.read(company);
  const whenAppendingTheCompleteOpening = (): Promise<void> =>
    journal.append('entreprise-a', [arriveeFixture, repriseFixture, pointageFixture]);
  const whenAppendingArrival = (): Promise<void> => journal.append('entreprise-a', [arriveeFixture]);
  const whenSavingAFreshReference = (): Promise<PupitreLocal> => journal.saveReferentiel('entreprise-a', refreshedReferenceFixture);
  const whenSavingARefusalWhileAppending = async (refusal: EvenementLocal): Promise<void> => {
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
  const whenStartingTheSecondOperation = (operation: 'synchronize' | 'withSession', chronology: string[]): Promise<void> =>
    journal[operation](async () => {
      await new Promise(resolve => setTimeout(resolve));
      chronology.push('second');
    });
  const whenTheFirstOperationHasEntered = (entered: SignalFixture): Promise<void> => entered.promise;
  const whenReleasingTheOperations = async (release: SignalFixture, ...operations: Promise<void>[]): Promise<void> => {
    release.release();
    await Promise.all(operations);
  };

  const thenStateIs = (state: PupitreLocal, expected: PupitreLocal): void => {
    expect(state).toEqual(expected);
  };
  const thenCompanyStateIs = async (company: string, expected: PupitreLocal): Promise<void> => {
    thenStateIs(await journal.read(company), expected);
  };
  const thenChronologyIs = (chronology: string[], expected: string[]): void => {
    expect(chronology).toEqual(expected);
  };
});
