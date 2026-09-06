import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { IDBDatabase, IDBFactory, IDBObjectStore, IDBRequest, IDBTransaction } from 'fake-indexeddb';
import { MockInstance, vi } from 'vitest';
import { IndexedDbLocalStorage } from './IndexedDbLocalStorage';

const adapters = [['IndexedDB', () => new IndexedDbLocalStorage()]] as const;

interface SynchronizationFixture {
  entered: SignalFixture;
  release: SignalFixture;
  chronology: string[];
}

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

const givenTheBrowserAbortsWrites = (): void => {
  const descriptor = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, 'put');
  const put: unknown = descriptor?.value;
  if (typeof put !== 'function') throw new Error('IndexedDB put is unavailable');
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
    const request: unknown = Reflect.apply(put, this, [value, key]);
    if (!(request instanceof IDBRequest)) throw new Error('IndexedDB put returned no request');
    const typedRequest = request as IDBRequest<IDBValidKey>;
    queueMicrotask(() => typedRequest.transaction?.abort());
    return typedRequest;
  });
};

const givenAbortSpy = (): MockInstance => vi.spyOn(IDBTransaction.prototype, 'abort');

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
    const abortSpy = givenAbortSpy();

    const failed = whenTheLocalUpdateFails();

    const error = await thenItFails(failed, 'disque');
    thenItHasACause(error, new Error('disque'));
    thenTransactionWasAborted(abortSpy);
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

    const error = await thenItFails(failed, 'Transaction locale interrompue');
    thenItHasACause(error);
  });

  it('should fail explicitly when the browser aborts writing to the local queue', async () => {
    givenTheBrowserAbortsWrites();

    const failed = whenRecording('atelier-a', ['nouveau']);

    const error = await thenItFails(failed, 'Transaction locale interrompue');
    thenItHasACause(error);
  });

  it('should refuse to read a database created by a newer version of the application', async () => {
    await givenANewerDatabase();

    const failed = whenReadingTheQueue();

    const error = await thenItFails(failed, 'Stockage local inaccessible');
    thenItHasACause(error);
  });

  it('should allow concurrent locks on different keys', async () => {
    const { firstEntered, secondEntered, releaseBoth } = givenConcurrentLockSignals();

    const operations = whenAcquiringLocksOnDifferentKeys(stockage, buildStockage(), firstEntered, secondEntered, releaseBoth);

    await thenBothLocksAreActiveConcurrently(firstEntered, secondEntered);
    await whenReleasingConcurrentLocks(releaseBoth, operations);
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
  const givenConcurrentLockSignals = () => ({
    firstEntered: new SignalFixture(),
    secondEntered: new SignalFixture(),
    releaseBoth: new SignalFixture(),
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
  const whenAcquiringLocksOnDifferentKeys = (
    firstStore: LocalStoragePort,
    secondStore: LocalStoragePort,
    firstEntered: SignalFixture,
    secondEntered: SignalFixture,
    releaseBoth: SignalFixture,
  ): [Promise<void>, Promise<void>] => [
    firstStore.lock('cle-1', async () => {
      firstEntered.release();
      await releaseBoth.promise;
    }),
    secondStore.lock('cle-2', async () => {
      secondEntered.release();
      await releaseBoth.promise;
    }),
  ];
  const whenReleasingConcurrentLocks = async (releaseBoth: SignalFixture, operations: [Promise<void>, Promise<void>]): Promise<void> => {
    releaseBoth.release();
    await Promise.all(operations);
  };
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
  const thenBothLocksAreActiveConcurrently = async (firstEntered: SignalFixture, secondEntered: SignalFixture): Promise<void> => {
    await Promise.all([firstEntered.promise, secondEntered.promise]);
    expect(firstEntered).toBeDefined();
    expect(secondEntered).toBeDefined();
  };
  const thenItContains = async (store: LocalStoragePort, key: string, value: unknown): Promise<void> => {
    expect(await store.read(key)).toEqual(value);
  };
  const thenItFails = async (failed: Promise<unknown>, message: string): Promise<Error> => {
    let captured: unknown;
    try {
      await failed;
    } catch (failure: unknown) {
      captured = failure;
    }
    expect(captured).toBeInstanceOf(Error);
    const error = captured as Error;
    expect(error.message).toContain(message);
    return error;
  };
  const thenItHasACause = (error: Error, expectedCause?: unknown): void => {
    expect(error.cause).toBeDefined();
    if (expectedCause !== undefined) {
      expect(error.cause).toEqual(expectedCause);
    }
  };
  const thenTransactionWasAborted = (abortSpy: MockInstance): void => {
    expect(abortSpy).toHaveBeenCalled();
  };
  const thenItCompleted = (value: string): void => {
    expect(value).toBe('termine');
  };
});

describe('IndexedDbLocalStorage, beyond the contract', () => {
  let stockage: IndexedDbLocalStorage;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    stockage = new IndexedDbLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should create the documents object store on upgrade', async () => {
    await whenReadingUnsetKey(stockage, 'cle-inexistante');

    await thenDatabaseContainsStore('glm-pupitre', 'documents');
  });

  it('should request strict durability on write transactions', async () => {
    const txSpy = givenTransactionSpy();

    await whenWriting(stockage, 'cle-1', 'valeur');

    thenTransactionHadStrictDurability(txSpy);
  });

  it('should close the database connection after reading', async () => {
    const closeSpy = givenCloseSpy();

    await whenReadingUnsetKey(stockage, 'cle-1');

    thenDatabaseWasClosed(closeSpy);
  });

  it('should close the database connection when read aborts', async () => {
    const closeSpy = givenCloseSpy();
    givenTheBrowserAbortsReads();

    await whenReadingFails(stockage, 'cle-1');

    thenDatabaseWasClosed(closeSpy);
  });

  it('should close the database connection after updating', async () => {
    const closeSpy = givenCloseSpy();

    await whenWriting(stockage, 'cle-1', 'valeur');

    thenDatabaseWasClosed(closeSpy);
  });

  it('should close the database connection when update aborts', async () => {
    const closeSpy = givenCloseSpy();
    givenTheBrowserAbortsWrites();

    await whenWritingFails(stockage, 'cle-1');

    thenDatabaseWasClosed(closeSpy);
  });

  const givenTransactionSpy = (): MockInstance => vi.spyOn(IDBDatabase.prototype, 'transaction');
  const givenCloseSpy = (): MockInstance => vi.spyOn(IDBDatabase.prototype, 'close');
  const whenReadingUnsetKey = (store: IndexedDbLocalStorage, key: string): Promise<unknown> => store.read(key);
  const whenWriting = (store: IndexedDbLocalStorage, key: string, value: string): Promise<string> => store.update(key, '', () => value);
  const whenReadingFails = async (store: IndexedDbLocalStorage, key: string): Promise<void> => {
    await store.read(key).catch(() => undefined);
  };
  const whenWritingFails = async (store: IndexedDbLocalStorage, key: string): Promise<void> => {
    await store.update(key, '', () => 'valeur').catch(() => undefined);
  };
  const thenDatabaseContainsStore = (databaseName: string, storeName: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onsuccess = () => {
        try {
          expect(request.result.objectStoreNames.contains(storeName)).toBe(true);
          request.result.close();
          resolve();
        } catch (error: unknown) {
          request.result.close();
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      request.onerror = () => {
        reject(new Error('Erreur ouverture'));
      };
    });
  const thenTransactionHadStrictDurability = (txSpy: MockInstance): void => {
    expect(txSpy).toHaveBeenCalledWith('documents', 'readwrite', { durability: 'strict' });
  };
  const thenDatabaseWasClosed = (closeSpy: MockInstance): void => {
    expect(closeSpy).toHaveBeenCalled();
  };
});
