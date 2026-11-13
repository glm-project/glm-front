import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import type { GesteDePointage } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { IndexedDbJournauxDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/IndexedDbJournauxDuPupitre';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { IndexedDbLocalStorage } from '@/pupitre/shared/local-storage/infrastructure/secondary/IndexedDbLocalStorage';
import { Injector, runInInjectionContext } from '@angular/core';

interface PendingGestureFixture {
  readonly id: string;
  readonly dateDeSurvenue: string;
  readonly operateurId: string;
}

const stockageDeLOrigineDuPupitreFixture = new IndexedDbLocalStorage();
const journauxFixture: JournauxDuPupitrePort = runInInjectionContext(
  Injector.create({ providers: [{ provide: LocalStoragePort, useValue: stockageDeLOrigineDuPupitreFixture }] }),
  () => new IndexedDbJournauxDuPupitre(),
);

export const givenAPendingGestureFixture = (entreprise: string, geste: PendingGestureFixture): void => {
  const pointage: GesteDePointage = { ...geste, nature: 'POINTAGE', suiviId: 'piece', type: 'DEBUT' };
  cy.then(() => journauxFixture.append(Entreprise.of(entreprise), [pointage]));
};

const deleteDatabaseFixture = (name: string | undefined): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (name === undefined) {
      resolve();
      return;
    }
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Impossible de nettoyer le stockage fixture', { cause: request.error }));
  });

export const clearPupitreStorageFixture = (): void => {
  cy.then(async () => {
    const bases = await indexedDB.databases();
    await Promise.all(bases.map(({ name }) => deleteDatabaseFixture(name)));
  });
};
