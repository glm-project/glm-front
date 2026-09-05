import { StockageLocalPort } from '@/app/shared/stockage-local/domain/StockageLocalPort';
import { TestBed } from '@angular/core/testing';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { IndexedDbStockageLocal } from './IndexedDbStockageLocal';

const adapters = [['IndexedDB', () => TestBed.inject(IndexedDbStockageLocal)]] as const;

describe.each(adapters)('StockageLocalPort contract, honoured by %s', (_adapter, buildStockage) => {
  let stockage: StockageLocalPort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: { request: async (_name: string, action: () => Promise<unknown>) => action() } });
    TestBed.configureTestingModule({ providers: [IndexedDbStockageLocal] });
    stockage = buildStockage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should restore a committed gesture after the browser service restarts', async () => {
    await whenRecording('atelier-a', ['geste-1']);

    const restarted = buildStockage();

    await thenItContains(restarted, 'atelier-a', ['geste-1']);
    await thenItContains(restarted, 'atelier-b', undefined);
  });

  it('should preserve both gestures when two tabs write at the same time', async () => {
    await Promise.all([whenAppending('premier'), whenAppending('second')]);

    await thenItContains(stockage, 'atelier-a', ['premier', 'second']);
  });

  it('should leave the committed queue untouched when a local update fails', async () => {
    await whenRecording('atelier-a', ['premier']);

    const failed = stockage.update('atelier-a', [], () => {
      throw new Error('disque');
    });

    await thenItFails(failed, 'disque');
    await thenItContains(stockage, 'atelier-a', ['premier']);
  });

  it('should report a storage open failure instead of accepting in memory', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('stockage inaccessible');
      },
    });

    const failed = stockage.read('atelier-a');

    await thenItFails(failed, 'stockage inaccessible');
  });

  it('should report browser transaction errors', async () => {
    const failed = stockage.update<unknown>('atelier-a', {}, () => ({ uncloneable: () => undefined }));

    await thenItFails(failed, 'cloned');
  });

  it('should perform the synchronization under a browser lock', async () => {
    const result = await stockage.lock('poussee', () => Promise.resolve('termine'));

    thenItCompleted(result);
  });

  it('should fail explicitly when the browser aborts reading the local queue', async () => {
    const get = IDBObjectStore.prototype.get;
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
      const request = get.call(this, key);
      queueMicrotask(() => request.transaction?.abort());
      return request;
    });

    const failed = stockage.read('atelier-a');

    await thenItFails(failed, 'Transaction locale interrompue');
  });

  it('should refuse to read a database created by a newer version of the application', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('glm-pupitre', 2);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(new Error('fixture inaccessible'));
    });

    const failed = stockage.read('atelier-a');

    await thenItFails(failed, 'Stockage local inaccessible');
  });

  const whenRecording = (key: string, gestes: string[]): Promise<string[]> => stockage.update(key, [], () => gestes);
  const whenAppending = (geste: string): Promise<string[]> => stockage.update<string[]>('atelier-a', [], gestes => [...gestes, geste]);
  const thenItContains = async (store: StockageLocalPort, key: string, value: unknown): Promise<void> => {
    expect(await store.read(key)).toEqual(value);
  };
  const thenItFails = async (failed: Promise<unknown>, message: string): Promise<void> => {
    await expect(failed).rejects.toThrow(message);
  };
  const thenItCompleted = (value: string): void => {
    expect(value).toBe('termine');
  };
});
