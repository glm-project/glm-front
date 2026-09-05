import { StockageLocalPort } from '@/pupitre/shared/stockage-local/domain/StockageLocalPort';
import { Injectable } from '@angular/core';

const DATABASE = 'glm-pupitre';
const DOCUMENTS = 'documents';

@Injectable()
export class IndexedDbStockageLocal extends StockageLocalPort {
  override async read<T>(cle: string): Promise<T | undefined> {
    const database = await this.open();
    return new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(DOCUMENTS, 'readonly');
      const request = transaction.objectStore(DOCUMENTS).get(cle);
      transaction.oncomplete = () => {
        database.close();
        resolve(request.result as T | undefined);
      };
      transaction.onabort = () => {
        database.close();
        reject(new Error('Transaction locale interrompue', { cause: transaction.error }));
      };
    });
  }

  override async update<T>(cle: string, initial: T, change: (value: T) => T): Promise<T> {
    const database = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(DOCUMENTS, 'readwrite', { durability: 'strict' });
      const store = transaction.objectStore(DOCUMENTS);
      const request = store.get(cle);
      let updated: T;
      transaction.oncomplete = () => {
        database.close();
        resolve(updated);
      };
      transaction.onabort = () => {
        database.close();
        reject(new Error('Transaction locale interrompue', { cause: transaction.error }));
      };
      request.onsuccess = () => {
        try {
          updated = change((request.result as T | undefined) ?? initial);
          store.put(updated, cle);
        } catch (failure: unknown) {
          transaction.abort();
          reject(new Error(String(failure), { cause: failure }));
        }
      };
    });
  }

  override async lock<T>(cle: string, action: () => Promise<T>): Promise<T> {
    return await navigator.locks.request(`${DATABASE}:${cle}`, action);
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(DOCUMENTS);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Stockage local inaccessible', { cause: request.error }));
    });
  }
}
