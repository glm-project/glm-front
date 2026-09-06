import type { EvenementDuJournal, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';

interface DurablePupitreFixture {
  entreprise: string;
  geste: { id: string; dateDeSurvenue: string; operateurId: string };
}

interface EnrolledPupitreFixture {
  readonly entreprise: string;
  readonly referentiel: ReferentielDuPupitre;
}

interface StoredPupitreFixture extends EnrolledPupitreFixture {
  readonly evenements: readonly EvenementDuJournal[];
}

export const pupitreTokenFixture = (entreprise: string): string => `header.${btoa(JSON.stringify({ tenant: entreprise }))}.signature`;

const persistPupitreFixture = (window: Cypress.AUTWindow, fixture: StoredPupitreFixture): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.open('glm-pupitre', 1);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('documents', 'readwrite');
      const token = pupitreTokenFixture(fixture.entreprise);
      transaction.objectStore('documents').put(
        {
          tenant: fixture.entreprise,
          session: {
            tenant: fixture.entreprise,
            accessToken: token,
            refreshToken: 'refresh-fixture',
            expiresAt: Date.now() + 300_000,
          },
        },
        'enrolement',
      );
      transaction.objectStore('documents').put(
        {
          connecte: true,
          referentiel: fixture.referentiel,
          evenements: fixture.evenements,
        },
        `atelier:${fixture.entreprise}`,
      );
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onabort = () => {
        database.close();
        reject(new Error('Fixture non conservee'));
      };
    };
    request.onerror = () => reject(new Error('Stockage fixture inaccessible'));
  });

export const givenDurablePupitreFixture = (fixture: DurablePupitreFixture): void => {
  cy.window().then(window =>
    persistPupitreFixture(window, {
      entreprise: fixture.entreprise,
      referentiel: { operateurs: [], suivis: [] },
      evenements: [
        {
          etat: 'EN_ATTENTE',
          geste: {
            id: fixture.geste.id,
            dateDeSurvenue: fixture.geste.dateDeSurvenue,
            operateurId: fixture.geste.operateurId,
            nature: 'ARRIVEE',
          },
        },
      ],
    }),
  );
};

export const givenEnrolledPupitreFixture = (fixture: EnrolledPupitreFixture): void => {
  cy.window().then(window => persistPupitreFixture(window, { ...fixture, evenements: [] }));
};

export const clearPupitreStorageFixture = (): void => {
  cy.window().then(
    window =>
      new Cypress.Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase('glm-pupitre');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Impossible de nettoyer le stockage fixture'));
      }),
  );
};
