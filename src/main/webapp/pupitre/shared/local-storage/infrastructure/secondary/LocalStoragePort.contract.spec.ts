import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { IDBFactory, IDBObjectStore, IDBRequest } from 'fake-indexeddb';
import { IndexedDbLocalStorage } from './IndexedDbLocalStorage';

const adapters = [['IndexedDB', () => new IndexedDbLocalStorage()]] as const;

interface SynchronizationFixture {
  entered: SignalFixture;
  release: SignalFixture;
  chronology: string[];
}

describe.each(adapters)('LocalStoragePort contract, honoured by %s', (_adapter, buildStockage) => {
  let stockage: LocalStoragePort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    stockage = buildStockage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should restore a committed gesture after the browser service restarts', async () => {
    await whenRecording('atelier-a', ['geste-1']);

    const restarted = whenRestartingTheBrowserService();

    await thenItContains(restarted, 'atelier-a', ['geste-1']);
    await thenItContains(restarted, 'atelier-b', undefined);
  });

  it('should preserve both gestures when two tabs write at the same time', async () => {
    await whenTwoTabsAppendAtTheSameTime();

    await thenItContains(stockage, 'atelier-a', ['premier', 'second']);
  });

  it('should leave the committed queue untouched when a local update fails', async () => {
    await givenACommittedQueue();

    const failed = whenTheLocalUpdateFails();

    await thenItFails(failed, 'disque');
    await thenItContains(stockage, 'atelier-a', ['premier']);
  });

  it('should report a storage open failure instead of accepting in memory', async () => {
    givenStorageCannotBeOpened();

    const failed = whenReadingTheQueue();

    await thenItFails(failed, 'stockage inaccessible');
  });

  it('should report browser transaction errors', async () => {
    const failed = whenWritingAnUncloneableValue();

    await thenItFails(failed, 'cloned');
  });

  it('should let only one tab synchronize at a time and release the next tab afterwards', async () => {
    const { entered, release, chronology } = givenSynchronizationSignals();

    const first = whenHoldingLock(stockage, entered, release, chronology);
    await whenTheFirstTabHasEntered(entered);

    const second = whenTakingLock(buildStockage(), chronology);
    await whenTheSecondTabHasHadATurnToEnter();

    await thenOnlyTheFirstTabRunsUntilReleased(chronology, release, first, second);

    thenTabsCompletedInOrder(chronology);
  });

  it('should release a failed synchronization so another tab can continue', async () => {
    const failure = whenSynchronizationFails();

    await thenItFails(failure, 'reseau');

    const result = await whenAnotherTabSynchronizes();

    thenItCompleted(result);
  });

  it('should fail explicitly when the browser aborts reading the local queue', async () => {
    givenTheBrowserAbortsReads();

    const failed = whenReadingTheQueue();

    await thenItFails(failed, 'Transaction locale interrompue');
  });

  it('should refuse to read a database created by a newer version of the application', async () => {
    await givenANewerDatabase();

    const failed = whenReadingTheQueue();

    await thenItFails(failed, 'Stockage local inaccessible');
  });

  const givenACommittedQueue = (): Promise<string[]> => whenRecording('atelier-a', ['premier']);
  const givenStorageCannotBeOpened = (): void => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('stockage inaccessible');
      },
    });
  };
  const givenSynchronizationSignals = (): SynchronizationFixture => ({
    entered: new SignalFixture(),
    release: new SignalFixture(),
    chronology: [],
  });

  const thenOnlyTheFirstTabRunsUntilReleased = async (
    chronology: string[],
    release: SignalFixture,
    first: Promise<void>,
    second: Promise<void>,
  ): Promise<void> => {
    try {
      thenOnlyFirstTabHasEntered(chronology);
    } finally {
      await whenReleasingTheTabs(release, first, second);
    }
  };
  const givenTheBrowserAbortsReads = (): void => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, 'get');
    const get: unknown = descriptor?.value;
    if (typeof get !== 'function') throw new Error('IndexedDB get is unavailable');
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
      const request: unknown = Reflect.apply(get, this, [key]);
      if (!(request instanceof IDBRequest)) throw new Error('IndexedDB get returned no request');
      queueMicrotask(() => request.transaction?.abort());
      return request;
    });
  };
  const givenANewerDatabase = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('glm-pupitre', 2);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => {
        reject(new Error('fixture inaccessible'));
      };
    });

  const whenRecording = (key: string, gestes: string[]): Promise<string[]> => stockage.update(key, [], () => gestes);
  const whenRestartingTheBrowserService = (): LocalStoragePort => buildStockage();
  const whenTwoTabsAppendAtTheSameTime = (): Promise<[string[], string[]]> =>
    Promise.all([whenAppending(stockage, 'premier'), whenAppending(buildStockage(), 'second')]);
  const whenTheLocalUpdateFails = (): Promise<string[]> =>
    stockage.update('atelier-a', [], () => {
      throw new Error('disque');
    });
  const whenReadingTheQueue = (): Promise<unknown> => stockage.read('atelier-a');
  const whenWritingAnUncloneableValue = (): Promise<unknown> =>
    stockage.update<unknown>('atelier-a', {}, () => ({ uncloneable: () => undefined }));
  const whenAppending = (store: LocalStoragePort, geste: string): Promise<string[]> =>
    store.update<string[]>('atelier-a', [], gestes => [...gestes, geste]);
  const whenHoldingLock = (store: LocalStoragePort, entered: SignalFixture, release: SignalFixture, chronology: string[]): Promise<void> =>
    store.lock('poussee', async () => {
      chronology.push('first entered');
      entered.release();
      await release.promise;
      chronology.push('first completed');
    });
  const whenTakingLock = (store: LocalStoragePort, chronology: string[]): Promise<void> =>
    store.lock('poussee', async () => {
      chronology.push('second entered');
      await new Promise(resolve => setTimeout(resolve));
      chronology.push('second completed');
    });
  const whenTheFirstTabHasEntered = (entered: SignalFixture): Promise<void> => entered.promise;
  const whenTheSecondTabHasHadATurnToEnter = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
  const whenReleasingTheTabs = async (release: SignalFixture, ...operations: Promise<void>[]): Promise<void> => {
    release.release();
    await Promise.all(operations);
  };
  const whenSynchronizationFails = (): Promise<unknown> => stockage.lock('poussee', () => Promise.reject(new Error('reseau')));
  const whenAnotherTabSynchronizes = (): Promise<string> => buildStockage().lock('poussee', () => Promise.resolve('termine'));
  const thenOnlyFirstTabHasEntered = (chronology: string[]): void => {
    expect(chronology).toEqual(['first entered']);
  };
  const thenTabsCompletedInOrder = (chronology: string[]): void => {
    expect(chronology).toEqual(['first entered', 'first completed', 'second entered', 'second completed']);
  };
  const thenItContains = async (store: LocalStoragePort, key: string, value: unknown): Promise<void> => {
    expect(await store.read(key)).toEqual(value);
  };
  const thenItFails = async (failed: Promise<unknown>, message: string): Promise<void> => {
    await expect(failed).rejects.toThrow(message);
  };
  const thenItCompleted = (value: string): void => {
    expect(value).toBe('termine');
  };
});
